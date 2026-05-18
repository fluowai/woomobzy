package config

import (
	"net/url"
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

	rawDBURL := getEnvAny([]string{
		"SUPABASE_DB_URL",
		"DATABASE_URL",
		"DATABASE_PRIVATE_URL",
		"POSTGRES_URL",
		"POSTGRES_PRIVATE_URL",
		"POSTGRES_PRISMA_URL",
		"POSTGRES_URL_NON_POOLING",
		"PGDATABASE_URL",
	}, "")

	cfg := &Config{
		Port:               getEnv("PORT", "3100"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		SupabaseURL:        getEnvAny([]string{"SUPABASE_URL", "VITE_SUPABASE_URL"}, ""),
		SupabaseServiceKey: getEnvAny([]string{"SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"}, ""),
		SupabaseDBURL:      normalizeDatabaseURL(rawDBURL),
		StorageBucket:      getEnv("SUPABASE_STORAGE_BUCKET", "whatsapp-media"),
		NodeURL:            strings.TrimRight(getEnv("NODE_URL", "http://localhost:3002"), "/"),
		InternalToken:      getEnv("WHATSAPP_INTERNAL_TOKEN", ""),
		AutomationEnabled:  getEnv("WHATSAPP_AI_AUTOMATION", "true") != "false",
	}

	corsStr := getEnv("CORS_ORIGINS", "http://localhost:3006,http://localhost:3002,https://consultio.com.br,https://imobzy.consultio.com.br,https://www.consultio.com.br")
	cfg.CORSOrigins = strings.Split(corsStr, ",")

	// Validate required fields
	if cfg.SupabaseDBURL == "" {
		logger.Fatal("Postgres database URL is required. Set SUPABASE_DB_URL, DATABASE_URL, DATABASE_PRIVATE_URL or POSTGRES_URL in Railway variables")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := cleanEnvValue(os.Getenv(key)); val != "" {
		return val
	}
	return fallback
}

func getEnvAny(keys []string, fallback string) string {
	for _, key := range keys {
		if val := cleanEnvValue(os.Getenv(key)); val != "" {
			return val
		}
	}
	return fallback
}

func cleanEnvValue(value string) string {
	value = strings.TrimSpace(value)
	value = strings.Trim(value, `"'`)
	return strings.TrimSpace(value)
}

func normalizeDatabaseURL(raw string) string {
	raw = cleanEnvValue(raw)
	if raw == "" {
		return ""
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}

	query := parsed.Query()

	if strings.Contains(parsed.Host, "supabase.co") && query.Get("sslmode") == "" {
		query.Set("sslmode", "require")
	}

	if query.Get("default_query_exec_mode") == "" {
		query.Set("default_query_exec_mode", "simple_protocol")
	}

	parsed.RawQuery = query.Encode()
	return parsed.String()
}
