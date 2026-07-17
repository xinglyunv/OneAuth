package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type PersonalToken struct {
	ent.Schema
}

func (PersonalToken) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("name").NotEmpty(),
		field.String("token_hash").Unique().NotEmpty().Sensitive(),
		field.String("scopes").Optional(),
		field.Time("expires_at").Optional().Nillable(),
		field.Time("last_used_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (PersonalToken) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("personal_tokens").Field("user_id").Unique().Required(),
	}
}

func (PersonalToken) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("token_hash").Unique(),
	}
}
