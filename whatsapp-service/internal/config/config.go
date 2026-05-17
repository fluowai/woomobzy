package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

// Config holds all application configuration
type Config struct {
	Port               string
	GinMode            string
	SupabaseURL        string
	SupabaseServiceKey string
	SupabaseDBURL      string
	StorageBucket      string
	CORSOrigins        []string
	NodeURL            string
	InternalToken      string
	AutomationEnabled  bool
}

// Load reads configuration from environment variables
func Load(logger *zap.Logger) *Config {
	// Try to load .env file (ignore error if not found)
	if err := godotenv.Load(); err != nil {
		logger.Warn("No .env file found, using environment variables")
	}

	cfg := &Config{
		Port:               getEnv("PORT", "3100"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		SupabaseURL:        getEnvAny([]string{"SUPABASE_URL", "VITE_SUPABASE_URL"}, ""),
		SupabaseServiceKey: getEnvAny([]string{"SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"}, ""),
		SupabaseDBURL: getEnvAny([]string{
			"SUPABASE_DB_URL",
			"DATABASE_URL",
			"DATABASE_PRIVATE_URL",
			"POSTGRES_URL",
			"POSTGRES_PRIVATE_URL",
			"POSTGRES_PRISMA_URL",
			"POSTGRES_URL_NON_POOLING",
			"PGDATABASE_URL",
		}, ""),
		StorageBucket:     getEnv("SUPABASE_STORAGE_BUCKET", "whatsapp-media"),
		NodeURL:           strings.TrimRight(getEnv("NODE_URL", "http://localhost:3002"), "/"),
		InternalToken:     getEnv("WHATSAPP_INTERNAL_TOKEN", ""),
		AutomationEnabled: getEnv("WHATSAPP_AI_AUTOMATION", "true") != "false",
	}

	corsStr := getEnv("CORS_ORIGINS", "http://localhost:3006,http://localhost:3002,https://consultio.com.br,https://imobzy.consultio.com.br,https://www.consultio.com.br,https://web-production-7c3f0.up.railway.app")
	cfg.CORSOrigins = strings.Split(corsStr, ",")

	// Validate required fields
	if cfg.SupabaseDBURL == "" {
		logger.Fatal("Postgres database URL is required. Set SUPABASE_DB_URL, DATABASE_URL, DATABASE_PRIVATE_URL or POSTGRES_URL in Railway variables")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvAny(keys []string, fallback string) string {
	for _, key := range keys {
		if val := os.Getenv(key); val != "" {
			return val
		}
	}
	return fallback
}
