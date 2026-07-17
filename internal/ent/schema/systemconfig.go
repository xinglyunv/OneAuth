package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type SystemConfig struct {
	ent.Schema
}

func (SystemConfig) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("key").Unique().NotEmpty(),
		field.Text("value").NotEmpty(),
		field.Text("description").Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (SystemConfig) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("key").Unique(),
	}
}
