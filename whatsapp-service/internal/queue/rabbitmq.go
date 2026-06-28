package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

const (
	DefaultMediaExchange   = "imobzy.whatsapp"
	DefaultMediaQueue      = "whatsapp.media.download"
	DefaultMediaRoutingKey = "media.download"
)

type MediaJob struct {
	MediaID    uuid.UUID `json:"media_id"`
	MessageID  uuid.UUID `json:"message_id,omitempty"`
	InstanceID uuid.UUID `json:"instance_id,omitempty"`
	TenantID   uuid.UUID `json:"tenant_id,omitempty"`
}

type RabbitMQ struct {
	url        string
	exchange   string
	queue      string
	routingKey string
	conn       *amqp.Connection
	logger     *zap.Logger
}

func NewRabbitMQ(rawURL, exchange, queueName, routingKey string, logger *zap.Logger) (*RabbitMQ, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, nil
	}
	if exchange == "" {
		exchange = DefaultMediaExchange
	}
	if queueName == "" {
		queueName = DefaultMediaQueue
	}
	if routingKey == "" {
		routingKey = DefaultMediaRoutingKey
	}

	conn, err := amqp.Dial(rawURL)
	if err != nil {
		return nil, err
	}

	q := &RabbitMQ{
		url:        rawURL,
		exchange:   exchange,
		queue:      queueName,
		routingKey: routingKey,
		conn:       conn,
		logger:     logger,
	}
	if err := q.ensureTopology(); err != nil {
		_ = conn.Close()
		return nil, err
	}
	return q, nil
}

func (q *RabbitMQ) Close() error {
	if q == nil || q.conn == nil {
		return nil
	}
	return q.conn.Close()
}

func (q *RabbitMQ) PublishMediaJob(ctx context.Context, job MediaJob) error {
	if q == nil || q.conn == nil || job.MediaID == uuid.Nil {
		return nil
	}

	body, err := json.Marshal(job)
	if err != nil {
		return err
	}

	ch, err := q.conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	return ch.PublishWithContext(ctx, q.exchange, q.routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	})
}

func (q *RabbitMQ) ConsumeMediaJobs(ctx context.Context, handler func(context.Context, MediaJob) error) error {
	if q == nil || q.conn == nil {
		return nil
	}

	ch, err := q.conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	if err := ch.Qos(4, 0, false); err != nil {
		return err
	}

	deliveries, err := ch.ConsumeWithContext(ctx, q.queue, "whatsapp-media-worker", false, false, false, false, nil)
	if err != nil {
		return err
	}

	for delivery := range deliveries {
		var job MediaJob
		if err := json.Unmarshal(delivery.Body, &job); err != nil {
			q.logger.Warn("Invalid RabbitMQ media job payload", zap.Error(err))
			_ = delivery.Nack(false, false)
			continue
		}
		if job.MediaID == uuid.Nil {
			q.logger.Warn("RabbitMQ media job without media_id")
			_ = delivery.Nack(false, false)
			continue
		}

		if err := handler(ctx, job); err != nil {
			q.logger.Warn("RabbitMQ media job handler failed", zap.String("media_id", job.MediaID.String()), zap.Error(err))
			_ = delivery.Nack(false, true)
			continue
		}
		_ = delivery.Ack(false)
	}

	return ctx.Err()
}

func (q *RabbitMQ) ensureTopology() error {
	ch, err := q.conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	if err := ch.ExchangeDeclare(q.exchange, "direct", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}
	if _, err := ch.QueueDeclare(q.queue, true, false, false, false, amqp.Table{
		"x-queue-type": "classic",
	}); err != nil {
		return fmt.Errorf("declare queue: %w", err)
	}
	if err := ch.QueueBind(q.queue, q.routingKey, q.exchange, false, nil); err != nil {
		return fmt.Errorf("bind queue: %w", err)
	}
	return nil
}
