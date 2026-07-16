package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Session struct {
	ent.Schema
}

func (Session) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("token_hash").Unique().NotEmpty(),
		field.UUID("device_id", uuid.UUID{}).Optional(),
		field.String("ip_address").Optional(),
		field.Text("user_agent").Optional(),
		field.Enum("status").Values("active", "revoked", "expired").Default("active"),
		field.Time("expires_at"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("last_active_at").Default(time.Now),
		field.Time("revoked_at").Optional().Nillable(),
	}
}

func (Session) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("sessions").Field("user_id").Unique().Required(),
		edge.From("device", Device.Type).Ref("sessions").Field("device_id").Unique(),
	}
}

func (Session) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("token_hash").Unique(),
		index.Fields("status"),
	}
}
