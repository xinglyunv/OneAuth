package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type LoginAttempt struct {
	ent.Schema
}

func (LoginAttempt) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("email").NotEmpty(),
		field.UUID("user_id", uuid.UUID{}).Optional(),
		field.String("ip_address").Optional(),
		field.Bool("success").Default(false),
		field.String("failure_reason").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (LoginAttempt) Edges() []ent.Edge {
	return nil
}

func (LoginAttempt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email"),
		index.Fields("email", "created_at"),
		index.Fields("ip_address"),
		index.Fields("user_id"),
	}
}
