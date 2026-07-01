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
	MinIOEndpoint      string
	MinIOPublicURL     string
	MinIOAccessKey     string
	MinIOSecretKey     string
	MinIORegion        string
	CORSOrigins        []string
	NodeURL            string
	WhatsMeowURL       string
	InternalToken      string
	ServiceToken       string
	WSJWTSecret        string
	AutomationEnabled  bool
	PairClientType     string
	PairClientName     string
}

// Load reads configuration from environment variables
func Load(logger *zap.Logger) *Config {
	// Try to load .env file (ignore error if not found)
	if err := godotenv.Load(); err != nil {
		logger.Warn("No .env file found, using environment variables")
	}

	logger.Info("Environment check",
		zap.Bool("DATABASE_URL_exists", cleanEnvValue(os.Getenv("DATABASE_URL")) != ""),
		zap.Bool("SUPABASE_DB_URL_exists", cleanEnvValue(os.Getenv("SUPABASE_DB_URL")) != ""),
		zap.Bool("DATABASE_PRIVATE_URL_exists", cleanEnvValue(os.Getenv("DATABASE_PRIVATE_URL")) != ""),
		zap.Bool("POSTGRES_URL_exists", cleanEnvValue(os.Getenv("POSTGRES_URL")) != ""),
		zap.Bool("WHATSMEOW_URL_exists", cleanEnvValue(os.Getenv("WHATSMEOW_URL")) != ""),
		zap.Bool("PGSSLMODE_exists", cleanEnvValue(os.Getenv("PGSSLMODE")) != ""),
	)

	rawDBURL := getEnvAny([]string{
		"SUPABASE_DB_URL",
		"DATABASE_URL",
		"DATABASE_PRIVATE_URL",
		"DIRECT_URL",
		"POSTGRES_URL",
		"POSTGRES_PRIVATE_URL",
		"POSTGRES_PRISMA_URL",
		"POSTGRES_URL_NON_POOLING",
		"POSTGRESQL_URL",
		"PGDATABASE_URL",
		"PG_URL",
		"DB_URL",
	}, "")

	cfg := &Config{
		Port:               getEnv("PORT", "3100"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		SupabaseURL:        getEnvAny([]string{"SUPABASE_URL", "VITE_SUPABASE_URL"}, ""),
		SupabaseServiceKey: getEnvAny([]string{"SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY"}, ""),
		SupabaseDBURL:      normalizeDatabaseURL(rawDBURL),
		StorageBucket:      getEnvAny([]string{"MINIO_WHATSAPP_BUCKET", "S3_WHATSAPP_BUCKET", "SUPABASE_STORAGE_BUCKET"}, "whatsapp-media"),
		MinIOEndpoint:      normalizeStorageEndpoint(getEnvAny([]string{"MINIO_ENDPOINT", "S3_ENDPOINT", "AWS_ENDPOINT_URL"}, ""), getEnvAny([]string{"MINIO_USE_SSL", "S3_USE_SSL"}, "false")),
		MinIOPublicURL:     normalizeStorageEndpoint(getEnvAny([]string{"MINIO_PUBLIC_URL", "MINIO_PUBLIC_ENDPOINT", "S3_PUBLIC_URL"}, ""), getEnvAny([]string{"MINIO_PUBLIC_USE_SSL", "MINIO_USE_SSL", "S3_USE_SSL"}, "false")),
		MinIOAccessKey:     getEnvAny([]string{"MINIO_ACCESS_KEY", "MINIO_ROOT_USER", "AWS_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"}, ""),
		MinIOSecretKey:     getEnvAny([]string{"MINIO_SECRET_KEY", "MINIO_ROOT_PASSWORD", "AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"}, ""),
		MinIORegion:        getEnvAny([]string{"MINIO_REGION", "AWS_REGION", "S3_REGION"}, "us-east-1"),
		NodeURL:            strings.TrimRight(getEnv("NODE_URL", "http://localhost:3002"), "/"),
		WhatsMeowURL:       strings.TrimRight(getEnvAny([]string{"WHATSMEOW_URL", "WHATSAPP_API_URL"}, "http://127.0.0.1:3100"), "/"),
		InternalToken:      getEnv("WHATSAPP_INTERNAL_TOKEN", ""),
		ServiceToken:       getEnvAny([]string{"WHATSAPP_SERVICE_TOKEN", "WHATSAPP_INTERNAL_TOKEN"}, ""),
		WSJWTSecret:        getEnv("WHATSAPP_WS_JWT_SECRET", ""),
		AutomationEnabled:  getEnv("WHATSAPP_AI_AUTOMATION", "true") != "false",
		PairClientType:     getEnv("WHATSAPP_PAIR_CLIENT_TYPE", "chrome"),
		PairClientName:     getEnv("WHATSAPP_PAIR_CLIENT_NAME", "Chrome (Windows)"),
	}

	corsStr := getEnvAny([]string{"CORS_ORIGINS", "ALLOWED_ORIGINS"}, "http://localhost:3006,http://localhost:3002,https://app.imobfluow.com.br,https://imobfluow.consultio.com.br,https://imobfluow.com.br,https://www.imobfluow.com.br,https://okaimoveis.com.br,https://www.okaimoveis.com.br")
	cfg.CORSOrigins = strings.Split(corsStr, ",")

	// Validate required fields
	if cfg.SupabaseDBURL == "" {
		logger.Fatal("Postgres database URL is required. Set SUPABASE_DB_URL, DATABASE_URL, DATABASE_PRIVATE_URL, DIRECT_URL or POSTGRES_URL in server variables")
	}
	if cfg.ServiceToken == "" {
		logger.Fatal("WhatsApp service token is required. Set WHATSAPP_SERVICE_TOKEN or WHATSAPP_INTERNAL_TOKEN")
	}
	if cleanEnvValue(os.Getenv("WHATSAPP_SERVICE_TOKEN")) == "" {
		logger.Warn("WHATSAPP_SERVICE_TOKEN is not set; using WHATSAPP_INTERNAL_TOKEN as a legacy fallback")
	}
	if !cfg.isMinIOConfigured() && !allowSupabaseStorageFallback() {
		logger.Fatal("MinIO/S3 media storage is required for WhatsApp media. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY and MINIO_WHATSAPP_BUCKET")
	}

	return cfg
}

func (c *Config) isMinIOConfigured() bool {
	return cleanEnvValue(c.MinIOEndpoint) != "" &&
		cleanEnvValue(c.MinIOAccessKey) != "" &&
		cleanEnvValue(c.MinIOSecretKey) != "" &&
		cleanEnvValue(c.StorageBucket) != ""
}

func allowSupabaseStorageFallback() bool {
	provider := strings.ToLower(cleanEnvValue(os.Getenv("MEDIA_STORAGE_PROVIDER")))
	if provider == "" {
		provider = strings.ToLower(cleanEnvValue(os.Getenv("STORAGE_PROVIDER")))
	}
	return provider == "supabase" || strings.EqualFold(cleanEnvValue(os.Getenv("ALLOW_SUPABASE_STORAGE_FALLBACK")), "true")
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

	if query.Get("sslmode") == "" {
		if sslMode := cleanEnvValue(os.Getenv("PGSSLMODE")); sslMode != "" {
			query.Set("sslmode", sslMode)
		} else if strings.Contains(parsed.Host, "supabase.co") {
			query.Set("sslmode", "require")
		}
	}

	if query.Get("default_query_exec_mode") == "" {
		query.Set("default_query_exec_mode", "simple_protocol")
	}

	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func normalizeStorageEndpoint(raw string, useSSLRaw string) string {
	raw = cleanEnvValue(raw)
	if raw == "" {
		return ""
	}
	raw = strings.TrimRight(raw, "/")
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	if strings.EqualFold(cleanEnvValue(useSSLRaw), "true") {
		return "https://" + raw
	}
	return "http://" + raw
}
