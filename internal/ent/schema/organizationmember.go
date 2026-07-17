package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type OrganizationMember struct {
	ent.Schema
}

func (OrganizationMember) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("organization_id", uuid.UUID{}),
		field.UUID("user_id", uuid.UUID{}),
		field.Enum("role").Values("owner", "admin", "member").Default("member"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (OrganizationMember) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("organization", Organization.Type).Ref("members").Field("organization_id").Unique().Required(),
	}
}

func (OrganizationMember) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("organization_id", "user_id").Unique(),
		index.Fields("user_id"),
	}
}
