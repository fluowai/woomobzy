package whatsapp

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

type WavHeader struct {
	ChunkID       [4]byte
	ChunkSize     uint32
	Format        [4]byte
	Subchunk1ID   [4]byte
	Subchunk1Size uint32
	AudioFormat   uint16
	NumChannels   uint16
	SampleRate    uint32
	ByteRate      uint32
	BlockAlign    uint16
	BitsPerSample uint16
	Subchunk2ID   [4]byte
	Subchunk2Size uint32
}

type CallRecordingService struct {
	logger      *zap.Logger
	cfg         VoipConfig
	minioClient *minio.Client
	bucket      string

	mu         sync.RWMutex
	recordings map[string]*activeRecording
}

type activeRecording struct {
	CallID     string
	PeerPhone  string
	StartedAt  time.Time
	Buffer     *bytes.Buffer
	SampleRate int
	Channels   int
	mu         sync.Mutex
}

func NewCallRecordingService(logger *zap.Logger, cfg VoipConfig) *CallRecordingService {
	svc := &CallRecordingService{
		logger:     logger,
		cfg:        cfg,
		recordings: make(map[string]*activeRecording),
	}

	if cfg.EnableRecording && cfg.RecordingBucket != "" {
		svc.bucket = cfg.RecordingBucket
		svc.initMinio()
	}

	return svc
}

func (s *CallRecordingService) initMinio() {
	if s.cfg.RecordingProvider != "minio" {
		return
	}

	endpoint := os.Getenv("MINIO_ENDPOINT")
	accessKey := os.Getenv("MINIO_ACCESS_KEY")
	secretKey := os.Getenv("MINIO_SECRET_KEY")
	useSSL := os.Getenv("MINIO_USE_SSL") == "true"

	if endpoint == "" || accessKey == "" || secretKey == "" {
		s.logger.Warn("MinIO not configured for call recordings")
		return
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		s.logger.Error("Failed to create MinIO client for recordings", zap.Error(err))
		return
	}

	s.minioClient = client

	ctx := context.Background()
	if exists, err := client.BucketExists(ctx, s.bucket); err != nil {
		s.logger.Warn("Failed to check recording bucket", zap.Error(err))
	} else if !exists {
		if err := client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
			s.logger.Warn("Failed to create recording bucket", zap.Error(err))
		}
	}
}

func (s *CallRecordingService) StartRecording(callID, peerPhone string) (string, error) {
	rec := &activeRecording{
		CallID:     callID,
		PeerPhone:  peerPhone,
		StartedAt:  time.Now(),
		Buffer:     &bytes.Buffer{},
		SampleRate: s.cfg.AudioSampleRate,
		Channels:   1,
	}

	// Write WAV header placeholder (will be updated at end)
	wavHeader := s.makeWavHeader(0, rec.SampleRate, rec.Channels)
	rec.Buffer.Write(wavHeader)

	s.mu.Lock()
	s.recordings[callID] = rec
	s.mu.Unlock()

	s.logger.Info("Recording started",
		zap.String("call_id", callID),
		zap.String("peer", peerPhone),
	)

	return callID, nil
}

func (s *CallRecordingService) FeedAudio(callID string, pcm []float32) error {
	s.mu.RLock()
	rec, ok := s.recordings[callID]
	s.mu.RUnlock()

	if !ok || rec == nil {
		return nil
	}

	rec.mu.Lock()
	defer rec.mu.Unlock()

	for _, sample := range pcm {
		var intSample int16
		switch {
		case sample >= 1:
			intSample = 32767
		case sample <= -1:
			intSample = -32768
		default:
			intSample = int16(sample * 32767)
		}
		binary.Write(rec.Buffer, binary.LittleEndian, intSample)
	}

	return nil
}

func (s *CallRecordingService) StopRecording(callID string) (*RecordingResult, error) {
	s.mu.Lock()
	rec, ok := s.recordings[callID]
	if !ok {
		s.mu.Unlock()
		return nil, fmt.Errorf("no active recording for call %s", callID)
	}
	delete(s.recordings, callID)
	s.mu.Unlock()

	rec.mu.Lock()
	defer rec.mu.Unlock()

	totalAudioBytes := rec.Buffer.Len() - 44
	if totalAudioBytes < 0 {
		totalAudioBytes = 0
	}
	durationSecs := totalAudioBytes / (rec.SampleRate * rec.Channels * 2)

	// Update WAV header with actual data size
	data := rec.Buffer.Bytes()
	wavHeader := s.makeWavHeader(totalAudioBytes, rec.SampleRate, rec.Channels)
	copy(data[:44], wavHeader)

	objectKey := fmt.Sprintf("calls/%s/%s.wav",
		time.Now().Format("2006/01/02"),
		callID,
	)

	result := &RecordingResult{
		CallID:       callID,
		DurationSecs: durationSecs,
		FileSize:     int64(len(data)),
		MimeType:     "audio/wav",
		Format:       "wav",
	}

	if s.minioClient != nil {
		ctx := context.Background()
		reader := bytes.NewReader(data)

		_, err := s.minioClient.PutObject(ctx, s.bucket, objectKey, reader, int64(len(data)),
			minio.PutObjectOptions{
				ContentType: "audio/wav",
				UserMetadata: map[string]string{
					"call-id":       callID,
					"peer-phone":    rec.PeerPhone,
					"duration-secs": fmt.Sprintf("%d", durationSecs),
				},
			},
		)
		if err != nil {
			s.logger.Error("Failed to upload recording", zap.Error(err))
			// Fall back to local file
			result = s.saveLocal(data, callID, objectKey, durationSecs)
		} else {
			publicBase := strings.TrimRight(s.publicStorageBaseURL(), "/")
			publicURL := fmt.Sprintf("%s/%s/%s",
				publicBase,
				s.bucket,
				objectKey,
			)
			result.PublicURL = publicURL
			result.FilePath = objectKey

			s.logger.Info("Recording uploaded to MinIO",
				zap.String("call_id", callID),
				zap.String("url", publicURL),
				zap.Int("duration_secs", durationSecs),
			)
		}
	} else {
		result = s.saveLocal(data, callID, objectKey, durationSecs)
	}

	return result, nil
}

func (s *CallRecordingService) publicStorageBaseURL() string {
	for _, key := range []string{"NEW_MINIO_PUBLIC_URL", "MINIO_PUBLIC_URL", "MINIO_PUBLIC_ENDPOINT", "S3_PUBLIC_URL"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" && !isLegacyStorageHost(value) {
			return value
		}
	}
	return "https://nb.consultio.com.br"
}

func (s *CallRecordingService) saveLocal(data []byte, callID, objectKey string, durationSecs int) *RecordingResult {
	localDir := filepath.Join("recordings", filepath.Dir(objectKey))
	if err := os.MkdirAll(localDir, 0755); err != nil {
		s.logger.Error("Failed to create local recording dir", zap.Error(err))
		return &RecordingResult{CallID: callID, DurationSecs: durationSecs}
	}

	localPath := filepath.Join("recordings", objectKey)
	if err := os.WriteFile(localPath, data, 0644); err != nil {
		s.logger.Error("Failed to save local recording", zap.Error(err))
		return &RecordingResult{CallID: callID, DurationSecs: durationSecs}
	}

	s.logger.Info("Recording saved locally",
		zap.String("call_id", callID),
		zap.String("path", localPath),
		zap.Int("duration_secs", durationSecs),
	)

	return &RecordingResult{
		CallID:       callID,
		FilePath:     localPath,
		DurationSecs: durationSecs,
		FileSize:     int64(len(data)),
		MimeType:     "audio/wav",
		Format:       "wav",
	}
}

func (s *CallRecordingService) GetRecordingURL(callID string) (string, error) {
	s.mu.RLock()
	rec, ok := s.recordings[callID]
	s.mu.RUnlock()

	if !ok || rec == nil {
		return "", fmt.Errorf("no active recording for call %s", callID)
	}

	return fmt.Sprintf("recording://%s", callID), nil
}

func (s *CallRecordingService) makeWavHeader(dataSizeBytes int, sampleRate int, channels int) []byte {
	header := &WavHeader{}
	copy(header.ChunkID[:], "RIFF")
	copy(header.Format[:], "WAVE")
	copy(header.Subchunk1ID[:], "fmt ")
	header.Subchunk1Size = 16
	header.AudioFormat = 1
	header.NumChannels = uint16(channels)
	header.SampleRate = uint32(sampleRate)
	header.BitsPerSample = 16
	header.ByteRate = uint32(sampleRate * channels * 2)
	header.BlockAlign = uint16(channels * 2)
	copy(header.Subchunk2ID[:], "data")
	header.Subchunk2Size = uint32(dataSizeBytes)
	header.ChunkSize = 36 + header.Subchunk2Size

	buf := new(bytes.Buffer)
	binary.Write(buf, binary.LittleEndian, header)
	return buf.Bytes()
}

func (s *CallRecordingService) ActiveRecordingCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.recordings)
}

func (s *CallRecordingService) Shutdown() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for callID, rec := range s.recordings {
		s.logger.Info("Saving incomplete recording on shutdown",
			zap.String("call_id", callID),
		)
		rec.mu.Lock()
		_ = rec.Buffer
		rec.mu.Unlock()
	}
	s.recordings = make(map[string]*activeRecording)
}

func MinIOWriter(w io.Writer, data []byte) (int, error) {
	return w.Write(data)
}

type uuidProvider struct{}

func (u uuidProvider) New() uuid.UUID {
	return uuid.New()
}

var UUIDProvider = uuidProvider{}
