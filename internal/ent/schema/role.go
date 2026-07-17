package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Role struct {
	ent.Schema
}

func (Role) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("name").Unique().NotEmpty(),
		field.Text("description").Optional(),
		field.Enum("scope").Values("system", "organization").Default("system"),
		field.UUID("organization_id", uuid.UUID{}).Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (Role) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("permissions", Permission.Type),
		edge.To("users", UserRole.Type),
	}
}

func (Role) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("name").Unique(),
	}
}
