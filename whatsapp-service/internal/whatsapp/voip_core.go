package whatsapp

type VoipConfig struct {
	Enabled             bool   `json:"enabled"`
	MaxCallsPerInstance int    `json:"max_calls_per_instance"`
	MaxCallsPerOperator int    `json:"max_calls_per_operator"`
	RelayTimeoutSeconds int    `json:"relay_timeout_seconds"`
	StunServer          string `json:"stun_server"`
	TurnServer          string `json:"turn_server,omitempty"`
	TurnUsername        string `json:"turn_username,omitempty"`
	TurnCredential      string `json:"turn_credential,omitempty"`
	AudioSampleRate     int    `json:"audio_sample_rate"`
	AudioFrameSize      int    `json:"audio_frame_size"`
	EnableRecording     bool   `json:"enable_recording"`
	RecordingBucket     string `json:"recording_bucket,omitempty"`
	RecordingProvider   string `json:"recording_provider,omitempty"`
	CodecBitrate        int    `json:"codec_bitrate"`
	CodecComplexity     int    `json:"codec_complexity"`
	EnableFEC           bool   `json:"enable_fec"`
	KeepaliveIntervalMs int    `json:"keepalive_interval_ms"`
	SilenceKeepaliveMs  int    `json:"silence_keepalive_ms"`
}

type VoipMetrics struct {
	CallID          string  `json:"call_id"`
	JitterMs        int     `json:"jitter_ms"`
	PacketLossPct   float64 `json:"packet_loss_pct"`
	RttMs           int     `json:"rtt_ms"`
	Codec           string  `json:"codec"`
	SampleRate      int     `json:"sample_rate"`
	RelayEndpoint   string  `json:"relay_endpoint"`
	LocalCandidate  string  `json:"local_candidate"`
	RemoteCandidate string  `json:"remote_candidate"`
	AudioLevelIn    float64 `json:"audio_level_in"`
	AudioLevelOut   float64 `json:"audio_level_out"`
	TotalPacketsTx  int64   `json:"total_packets_tx"`
	TotalPacketsRx  int64   `json:"total_packets_rx"`
	TotalBytesTx    int64   `json:"total_bytes_tx"`
	TotalBytesRx    int64   `json:"total_bytes_rx"`
}

var DefaultVoipConfig = VoipConfig{
	Enabled:             true,
	MaxCallsPerInstance: 4,
	MaxCallsPerOperator: 1,
	RelayTimeoutSeconds: 20,
	StunServer:          "stun:stun.whatsapp.net:3478",
	AudioSampleRate:     16000,
	AudioFrameSize:      960,
	EnableRecording:     false,
	CodecBitrate:        6000,
	CodecComplexity:     5,
	EnableFEC:           false,
	KeepaliveIntervalMs: 1100,
	SilenceKeepaliveMs:  120,
}

func (c *VoipConfig) Validate() error {
	if c.MaxCallsPerInstance < 0 {
		c.MaxCallsPerInstance = 0
	}
	if c.MaxCallsPerOperator < 0 {
		c.MaxCallsPerOperator = 0
	}
	if c.AudioSampleRate <= 0 {
		c.AudioSampleRate = 16000
	}
	if c.AudioFrameSize <= 0 {
		c.AudioFrameSize = 960
	}
	if c.RelayTimeoutSeconds <= 0 {
		c.RelayTimeoutSeconds = 20
	}
	if c.KeepaliveIntervalMs <= 0 {
		c.KeepaliveIntervalMs = 1100
	}
	if c.CodecBitrate <= 0 {
		c.CodecBitrate = 6000
	}
	return nil
}

type CallRecordingProcessor interface {
	StartRecording(callID string, peerPhone string) (string, error)
	StopRecording(callID string) (*RecordingResult, error)
	GetRecordingURL(callID string) (string, error)
}

type RecordingResult struct {
	CallID       string `json:"call_id"`
	FilePath     string `json:"file_path"`
	PublicURL    string `json:"public_url"`
	DurationSecs int    `json:"duration_secs"`
	FileSize     int64  `json:"file_size"`
	MimeType     string `json:"mime_type"`
	Format       string `json:"format"`
}

type CallTranscriber interface {
	Transcribe(callID string, audioURL string, language string) (string, error)
	GetTranscription(callID string) (string, error)
}

type CallAnalytics struct {
	CallID         string   `json:"call_id"`
	TalkTimeRatio  float64  `json:"talk_time_ratio"`
	SilenceRatio   float64  `json:"silence_ratio"`
	AvgAudioLevel  float64  `json:"avg_audio_level"`
	PeakAudioLevel float64  `json:"peak_audio_level"`
	Interruptions  int      `json:"interruptions"`
	Sentiment      string   `json:"sentiment,omitempty"`
	Keywords       []string `json:"keywords,omitempty"`
	Summary        string   `json:"summary,omitempty"`
}
