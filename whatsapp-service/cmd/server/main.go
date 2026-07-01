package main

import (
	"context"
	"crypto/subtle"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"whatsapp-service/internal/config"
	"whatsapp-service/internal/handlers"
	"whatsapp-service/internal/repository"
	"whatsapp-service/internal/whatsapp"
	"whatsapp-service/internal/ws"
	"whatsapp-service/pkg/logger"
)

func main() {
	// Initialize logger
	log := logger.New()
	defer log.Sync()

	log.Info("🚀 Starting WhatsApp Service")

	// Load configuration
	cfg := config.Load(log)

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Connect to database
	ctx := context.Background()
	poolConfig, err := pgxpool.ParseConfig(cfg.SupabaseDBURL)
	if err != nil {
		log.Fatal(fmt.Sprintf("Failed to parse database config: %v", err))
	}
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatal(fmt.Sprintf("Failed to connect to database: %v", err))
	}
	defer pool.Close()

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		log.Error(fmt.Sprintf("⚠️ Database ping failed: %v. Server will continue to start.", err))
	} else {
		log.Info("✅ Connected to database")
	}

	// Initialize repositories
	instanceRepo := repository.NewInstanceRepo(pool, log)
	chatRepo := repository.NewChatRepo(pool, log)
	contactRepo := repository.NewContactRepo(pool, log)
	messageRepo := repository.NewMessageRepo(pool, log)
	mediaRepo := repository.NewMediaRepo(pool, log)
	callRepo := repository.NewCallRepo(pool, log)

	// Initialize WebSocket hub
	hub := ws.NewHub(log, cfg.CORSOrigins)
	go hub.Run()
	log.Info("✅ WebSocket hub started")

	// Initialize WhatsApp manager
	manager := whatsapp.NewManager(
		instanceRepo, chatRepo, contactRepo, messageRepo, mediaRepo, callRepo,
		hub, log, cfg.SupabaseDBURL,
		cfg.SupabaseURL, cfg.SupabaseServiceKey, cfg.StorageBucket,
		cfg.MinIOEndpoint, cfg.MinIOPublicURL, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIORegion,
		cfg.NodeURL, cfg.InternalToken, cfg.AutomationEnabled, cfg.PairClientType, cfg.PairClientName,
	)

	// Auto-reconnect existing sessions
	go manager.ReconnectAll(ctx)
	manager.StartMediaWorker()

	// Initialize handlers
	instanceHandler := handlers.NewInstanceHandler(manager, instanceRepo, log)
	chatHandler := handlers.NewChatHandler(chatRepo, contactRepo, instanceRepo, log)
	messageHandler := handlers.NewMessageHandler(messageRepo, mediaRepo, chatRepo, manager, log)
	callHandler := handlers.NewCallHandler(manager, instanceRepo, callRepo, log)

	// Setup Gin router
	router := gin.New()
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "x-tenant-id"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Request logger middleware
	router.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/health", "/ws"},
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":     "ok",
			"service":    "whatsapp-service",
			"ws_clients": hub.ClientCount(),
		})
	})

	// WebSocket endpoint
	internalAuth := requireInternalAuth(cfg.ServiceToken)
	router.GET("/ws", internalAuth, func(c *gin.Context) {
		hub.HandleWebSocket(c.Writer, c.Request)
	})
	router.POST("/ws", func(c *gin.Context) {
		proxyLegacyWsToken(c, cfg.NodeURL)
	})

	// API routes
	api := router.Group("/api", internalAuth)
	{
		// Instance routes
		instances := api.Group("/instances")
		{
			instances.POST("", instanceHandler.CreateInstance)
			instances.GET("", instanceHandler.ListInstances)
			instances.GET("/:id", instanceHandler.GetInstance)
			instances.DELETE("/:id", instanceHandler.DeleteInstance)
			instances.GET("/:id/qrcode", instanceHandler.GetQRCode)
			instances.POST("/:id/pair-code", instanceHandler.RequestPairCode)
			instances.POST("/:id/connect", instanceHandler.ConnectInstance)
			instances.POST("/:id/logout", instanceHandler.LogoutInstance)
			instances.POST("/:id/import-history", instanceHandler.ImportHistory)
		}

		// Chat routes
		chats := api.Group("/chats")
		{
			chats.GET("", chatHandler.ListChats)
			chats.POST("/ensure", chatHandler.EnsureDirectChat)
			chats.DELETE("", chatHandler.DeleteAllChats)
			chats.POST("/:id/read", chatHandler.MarkChatRead)
			chats.PATCH("/:id/contact", chatHandler.UpdateContactName)
		}

		// Message routes
		messages := api.Group("/messages")
		{
			messages.GET("/:chatId", messageHandler.ListMessages)
			messages.POST("/:chatId/send", messageHandler.SendMessage)
			messages.POST("/:chatId/send-media", messageHandler.SendMediaMessage)
		}

		// Call routes
		calls := api.Group("/instances/:id/calls")
		{
			calls.POST("", callHandler.StartCall)
			calls.POST("/accept", callHandler.AcceptCall)
			calls.POST("/reject", callHandler.RejectCall)
			calls.POST("/:callId/end", callHandler.EndCall)
			calls.POST("/webrtc", callHandler.ExchangeWebRTC)
			calls.GET("", callHandler.ListActiveCalls)
		}

		// Call history routes
		api.GET("/calls", callHandler.ListReports)
		api.GET("/calls/stats", callHandler.GetCallStats)
		api.GET("/calls/:callId", callHandler.GetCallReport)
		api.GET("/instances/:id/calls/summary", callHandler.GetDailySummary)
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		log.Info(fmt.Sprintf("✅ Server listening on %s", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(fmt.Sprintf("Server error: %v", err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("🛑 Shutting down server...")

	// Disconnect all WhatsApp instances
	manager.Shutdown()

	// Shutdown HTTP server
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal(fmt.Sprintf("Server forced to shutdown: %v", err))
	}

	log.Info("👋 Server exited")
}

func requireInternalAuth(expected string) gin.HandlerFunc {
	return func(c *gin.Context) {
		received := c.GetHeader("x-whatsapp-service-token")
		if expected == "" || len(received) != len(expected) || subtle.ConstantTimeCompare([]byte(received), []byte(expected)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized internal request"})
			return
		}
		if c.Request.URL.Path != "/health" && c.GetHeader("x-tenant-id") == "" && c.Request.URL.Path != "/ws" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "x-tenant-id is required"})
			return
		}
		c.Next()
	}
}

func proxyLegacyWsToken(c *gin.Context, nodeURL string) {
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, nodeURL+"/api/whatsapp/socket-token", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create token request"})
		return
	}

	for _, header := range []string{"Authorization", "x-impersonate-org-id"} {
		if value := c.GetHeader(header); value != "" {
			req.Header.Set(header, value)
		}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach api token endpoint"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to read api token response"})
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}
	c.Data(resp.StatusCode, contentType, body)
}
