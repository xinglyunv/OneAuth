package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Webhook struct {
	ent.Schema
}

func (Webhook) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}).Optional(),
		field.String("url").NotEmpty(),
		field.String("secret").Optional().Sensitive(),
		field.Text("event_types").NotEmpty(),
		field.Enum("status").Values("active", "disabled").Default("active"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Webhook) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("events", WebhookEvent.Type),
	}
}

func (Webhook) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
	}
}
