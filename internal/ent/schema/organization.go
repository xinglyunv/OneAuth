package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type Organization struct {
	ent.Schema
}

func (Organization) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("name").NotEmpty(),
		field.String("slug").Unique().NotEmpty(),
		field.Text("description").Optional(),
		field.String("domain").Optional(),
		field.String("logo_url").Optional(),
		field.UUID("owner_id", uuid.UUID{}),
		field.Enum("status").Values("active", "disabled").Default("active"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
		field.Time("deleted_at").Optional().Nillable(),
	}
}

func (Organization) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("members", OrganizationMember.Type),
	}
}

func (Organization) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("slug").Unique(),
		index.Fields("owner_id"),
	}
}
