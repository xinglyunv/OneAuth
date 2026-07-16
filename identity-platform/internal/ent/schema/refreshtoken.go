package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type RefreshToken struct {
	ent.Schema
}

func (RefreshToken) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("token_hash").Unique().NotEmpty(),
		field.UUID("family_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("client_id", uuid.UUID{}),
		field.JSON("scopes", []string{}),
		field.Time("expires_at"),
		field.Time("revoked_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (RefreshToken) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("refresh_tokens").Field("user_id").Unique().Required(),
	}
}

func (RefreshToken) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("token_hash").Unique(),
		index.Fields("family_id"),
		index.Fields("user_id"),
		index.Fields("client_id"),
		index.Fields("user_id", "client_id"),
	}
}
