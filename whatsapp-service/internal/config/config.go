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
		SupabaseURL:        getEnv("SUPABASE_URL", ""),
		SupabaseServiceKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseDBURL:      getEnv("SUPABASE_DB_URL", ""),
		StorageBucket:      getEnv("SUPABASE_STORAGE_BUCKET", "whatsapp-media"),
	}

	corsStr := getEnv("CORS_ORIGINS", "http://localhost:3006")
	cfg.CORSOrigins = strings.Split(corsStr, ",")

	// Validate required fields
	if cfg.SupabaseDBURL == "" {
		logger.Fatal("SUPABASE_DB_URL is required")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
