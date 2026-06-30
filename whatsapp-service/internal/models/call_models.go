package models

import (
	"time"

	"github.com/google/uuid"
)

type CallDirection string

const (
	CallDirectionInbound  CallDirection = "inbound"
	CallDirectionOutbound CallDirection = "outbound"
)

type CallStatus string

const (
	CallStatusPending   CallStatus = "pending"
	CallStatusRinging   CallStatus = "ringing"
	CallStatusConnected CallStatus = "connected"
	CallStatusEnded     CallStatus = "ended"
	CallStatusFailed    CallStatus = "failed"
)

type CallEndReason string

const (
	CallEndReasonUserEnded CallEndReason = "user_ended"
	CallEndReasonDeclined  CallEndReason = "declined"
	CallEndReasonNoAnswer  CallEndReason = "no_answer"
	CallEndReasonBusy      CallEndReason = "busy"
	CallEndReasonFailed    CallEndReason = "failed"
	CallEndReasonCancelled CallEndReason = "cancelled"
	CallEndReasonTimeout   CallEndReason = "timeout"
	CallEndReasonUnknown   CallEndReason = "unknown"
)

type CallRecordStatus string

const (
	CallRecordStatusNone    CallRecordStatus = "none"
	CallRecordStatusPending CallRecordStatus = "pending"
	CallRecordStatusReady   CallRecordStatus = "ready"
	CallRecordStatusFailed  CallRecordStatus = "failed"
)

type CallQuality string

const (
	CallQualityExcellent CallQuality = "excellent"
	CallQualityGood      CallQuality = "good"
	CallQualityFair      CallQuality = "fair"
	CallQualityPoor      CallQuality = "poor"
	CallQualityUnknown   CallQuality = "unknown"
)

type Call struct {
	ID           uuid.UUID     `json:"id" db:"id"`
	InstanceID   uuid.UUID     `json:"instance_id" db:"instance_id"`
	TenantID     *uuid.UUID    `json:"tenant_id,omitempty" db:"tenant_id"`
	CallID       string        `json:"call_id" db:"call_id"`
	PeerJID      string        `json:"peer_jid" db:"peer_jid"`
	PeerPhone    string        `json:"peer_phone" db:"peer_phone"`
	PeerName     string        `json:"peer_name,omitempty" db:"peer_name"`
	Direction    CallDirection `json:"direction" db:"direction"`
	Status       CallStatus    `json:"status" db:"status"`
	EndReason    CallEndReason `json:"end_reason,omitempty" db:"end_reason"`
	DurationSecs int           `json:"duration_secs" db:"duration_secs"`
	StartedAt    *time.Time    `json:"started_at,omitempty" db:"started_at"`
	ConnectedAt  *time.Time    `json:"connected_at,omitempty" db:"connected_at"`
	EndedAt      *time.Time    `json:"ended_at,omitempty" db:"ended_at"`
	CreatedAt    time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at" db:"updated_at"`
}

type CallRecording struct {
	ID            uuid.UUID        `json:"id" db:"id"`
	CallID        uuid.UUID        `json:"call_id" db:"call_id"`
	InstanceID    uuid.UUID        `json:"instance_id" db:"instance_id"`
	TenantID      *uuid.UUID       `json:"tenant_id,omitempty" db:"tenant_id"`
	Status        CallRecordStatus `json:"status" db:"status"`
	Provider      string           `json:"provider" db:"provider"`
	Bucket        string           `json:"bucket" db:"bucket"`
	ObjectKey     string           `json:"object_key" db:"object_key"`
	PublicURL     string           `json:"public_url,omitempty" db:"public_url"`
	Filename      string           `json:"filename,omitempty" db:"filename"`
	MimeType      string           `json:"mime_type,omitempty" db:"mime_type"`
	DurationSecs  int              `json:"duration_secs" db:"duration_secs"`
	FileSizeBytes int64            `json:"file_size_bytes,omitempty" db:"file_size_bytes"`
	RetryCount    int              `json:"retry_count" db:"retry_count"`
	LastError     string           `json:"last_error,omitempty" db:"last_error"`
	CreatedAt     time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at" db:"updated_at"`
}

type CallReport struct {
	Call
	Recording     *CallRecording `json:"recording,omitempty"`
	InstanceName  string         `json:"instance_name,omitempty"`
	TenantName    string         `json:"tenant_name,omitempty"`
	Quality       CallQuality    `json:"quality,omitempty"`
	AvgLatencyMs  int            `json:"avg_latency_ms,omitempty"`
	MaxLatencyMs  int            `json:"max_latency_ms,omitempty"`
	PacketLossPct float64        `json:"packet_loss_pct,omitempty"`
	JitterMs      int            `json:"jitter_ms,omitempty"`
	RelayEndpoint string         `json:"relay_endpoint,omitempty"`
	CodecUsed     string         `json:"codec_used,omitempty"`
	SampleRate    int            `json:"sample_rate,omitempty"`
}

type CallDailySummary struct {
	Date          time.Time `json:"date"`
	TotalCalls    int       `json:"total_calls"`
	InboundCalls  int       `json:"inbound_calls"`
	OutboundCalls int       `json:"outbound_calls"`
	AnsweredCalls int       `json:"answered_calls"`
	MissedCalls   int       `json:"missed_calls"`
	TotalDuration int       `json:"total_duration_secs"`
	AvgDuration   int       `json:"avg_duration_secs"`
	FailedCalls   int       `json:"failed_calls"`
	RecordedCalls int       `json:"recorded_calls"`
}

type CallReportFilter struct {
	InstanceID *uuid.UUID     `json:"instance_id,omitempty"`
	TenantID   *uuid.UUID     `json:"tenant_id,omitempty"`
	Direction  *CallDirection `json:"direction,omitempty"`
	Status     *CallStatus    `json:"status,omitempty"`
	DateFrom   *time.Time     `json:"date_from,omitempty"`
	DateTo     *time.Time     `json:"date_to,omitempty"`
	PeerPhone  string         `json:"peer_phone,omitempty"`
	Limit      int            `json:"limit,omitempty"`
	Offset     int            `json:"offset,omitempty"`
}

type CallStats struct {
	TotalCalls       int     `json:"total_calls"`
	TotalDuration    int     `json:"total_duration_secs"`
	AvgDuration      int     `json:"avg_duration_secs"`
	InboundCalls     int     `json:"inbound_calls"`
	OutboundCalls    int     `json:"outbound_calls"`
	AnsweredCalls    int     `json:"answered_calls"`
	MissedCalls      int     `json:"missed_calls"`
	FailedCalls      int     `json:"failed_calls"`
	DeclinedCalls    int     `json:"declined_calls"`
	TotalRecordings  int     `json:"total_recordings"`
	AnswerRate       float64 `json:"answer_rate"`
	AvgCallPerDay    float64 `json:"avg_calls_per_day"`
	TotalUniquePeers int     `json:"total_unique_peers"`
}

type StartCallRequest struct {
	Phone   string `json:"phone" binding:"required"`
	IsVideo bool   `json:"is_video,omitempty"`
	Record  bool   `json:"record,omitempty"`
}

type AcceptCallRequest struct {
	CallID string `json:"call_id" binding:"required"`
}

type WebRTCRequest struct {
	CallID   string `json:"call_id" binding:"required"`
	SDPOffer string `json:"sdp_offer" binding:"required"`
}

type WebRTCResponse struct {
	CallID    string `json:"call_id"`
	SDPAnswer string `json:"sdp_answer"`
}

type CallEvent struct {
	InstanceID uuid.UUID   `json:"instance_id"`
	CallID     string      `json:"call_id"`
	Event      string      `json:"event"`
	Data       interface{} `json:"data,omitempty"`
}
