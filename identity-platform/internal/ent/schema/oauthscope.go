package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type OAuthScope struct {
	ent.Schema
}

func (OAuthScope) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("name").Unique().NotEmpty(),
		field.Text("description").NotEmpty(),
		field.Bool("is_default").Default(false),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (OAuthScope) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("name").Unique(),
	}
}
