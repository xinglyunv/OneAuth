package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type AuthorizationCode struct {
	ent.Schema
}

func (AuthorizationCode) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("code_hash").Unique().NotEmpty(),
		field.UUID("client_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}),
		field.String("redirect_uri").NotEmpty(),
		field.JSON("scopes", []string{}),
		field.String("code_challenge").Optional(),
		field.String("code_challenge_method").Optional(),
		field.Time("expires_at"),
		field.Time("used_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (AuthorizationCode) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("code_hash").Unique(),
		index.Fields("client_id"),
		index.Fields("user_id"),
	}
}
