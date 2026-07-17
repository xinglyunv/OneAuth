package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type UserRole struct {
	ent.Schema
}

func (UserRole) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("role_id", uuid.UUID{}),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (UserRole) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("roles").Field("user_id").Unique().Required(),
		edge.From("role", Role.Type).Ref("users").Field("role_id").Unique().Required(),
	}
}

func (UserRole) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id", "role_id").Unique(),
	}
}
