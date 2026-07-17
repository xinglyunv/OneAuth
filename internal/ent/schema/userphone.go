package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type UserPhone struct {
	ent.Schema
}

func (UserPhone) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("phone").Unique().NotEmpty(),
		field.Bool("verified").Default(false),
		field.Time("verified_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (UserPhone) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("phones").Field("user_id").Unique().Required(),
	}
}

func (UserPhone) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("phone").Unique(),
		index.Fields("user_id"),
	}
}
