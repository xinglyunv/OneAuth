package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type WebhookEvent struct {
	ent.Schema
}

func (WebhookEvent) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("webhook_id", uuid.UUID{}),
		field.String("event_type").NotEmpty(),
		field.JSON("payload", map[string]interface{}{}),
		field.Enum("status").Values("pending", "delivered", "failed").Default("pending"),
		field.Int("attempts").Default(0),
		field.Time("last_attempt_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (WebhookEvent) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("webhook", Webhook.Type).Ref("events").Field("webhook_id").Unique().Required(),
	}
}

func (WebhookEvent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("webhook_id"),
		index.Fields("status"),
	}
}
