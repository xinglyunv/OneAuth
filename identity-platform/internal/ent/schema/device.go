package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Device struct {
	ent.Schema
}

func (Device) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("fingerprint").NotEmpty(),
		field.String("name").Optional(),
		field.String("platform").Optional(),
		field.String("browser").Optional(),
		field.String("last_ip").Optional(),
		field.Time("last_seen_at").Default(time.Now),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (Device) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("devices").Field("user_id").Unique().Required(),
		edge.To("sessions", Session.Type),
	}
}

func (Device) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("user_id", "fingerprint").Unique(),
	}
}
