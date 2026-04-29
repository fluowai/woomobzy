package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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
	pool, err := pgxpool.New(ctx, cfg.SupabaseDBURL)
	if err != nil {
		log.Fatal(fmt.Sprintf("Failed to connect to database: %v", err))
	}
	defer pool.Close()

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatal(fmt.Sprintf("Failed to ping database: %v", err))
	}
	log.Info("✅ Connected to database")

	// Initialize repositories
	instanceRepo := repository.NewInstanceRepo(pool, log)
	chatRepo := repository.NewChatRepo(pool, log)
	contactRepo := repository.NewContactRepo(pool, log)
	messageRepo := repository.NewMessageRepo(pool, log)

	// Initialize WebSocket hub
	hub := ws.NewHub(log)
	go hub.Run()
	log.Info("✅ WebSocket hub started")

	// Initialize WhatsApp manager
	manager := whatsapp.NewManager(
		instanceRepo, chatRepo, contactRepo, messageRepo,
		hub, log, cfg.SupabaseDBURL,
		cfg.SupabaseURL, cfg.SupabaseServiceKey, cfg.StorageBucket,
	)

	// Auto-reconnect existing sessions
	go manager.ReconnectAll(ctx)

	// Initialize handlers
	instanceHandler := handlers.NewInstanceHandler(manager, instanceRepo, log)
	chatHandler := handlers.NewChatHandler(chatRepo, log)
	messageHandler := handlers.NewMessageHandler(messageRepo, chatRepo, manager, log)

	// Setup Gin router
	router := gin.New()
	router.Use(gin.Recovery())

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
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
	router.GET("/ws", func(c *gin.Context) {
		hub.HandleWebSocket(c.Writer, c.Request)
	})

	// API routes
	api := router.Group("/api")
	{
		// Instance routes
		instances := api.Group("/instances")
		{
			instances.POST("", instanceHandler.CreateInstance)
			instances.GET("", instanceHandler.ListInstances)
			instances.GET("/:id", instanceHandler.GetInstance)
			instances.DELETE("/:id", instanceHandler.DeleteInstance)
			instances.GET("/:id/qrcode", instanceHandler.GetQRCode)
			instances.POST("/:id/connect", instanceHandler.ConnectInstance)
			instances.POST("/:id/logout", instanceHandler.LogoutInstance)
		}

		// Chat routes
		chats := api.Group("/chats")
		{
			chats.GET("", chatHandler.ListChats)
			chats.POST("/:id/read", chatHandler.MarkChatRead)
		}

		// Message routes
		messages := api.Group("/messages")
		{
			messages.GET("/:chatId", messageHandler.ListMessages)
			messages.POST("/:chatId/send", messageHandler.SendMessage)
		}
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
