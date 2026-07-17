package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type UserEmail struct {
	ent.Schema
}

func (UserEmail) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("email").Unique().NotEmpty(),
		field.Bool("is_primary").Default(false),
		field.Bool("verified").Default(false),
		field.Time("verified_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (UserEmail) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("emails").Field("user_id").Unique().Required(),
	}
}

func (UserEmail) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email").Unique(),
		index.Fields("user_id"),
		index.Fields("user_id", "is_primary"),
	}
}
