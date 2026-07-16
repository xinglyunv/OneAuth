package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

type UserProfile struct {
	ent.Schema
}

func (UserProfile) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}).Unique(),
		field.String("display_name").Optional(),
		field.String("avatar_url").Optional(),
		field.String("locale").Default("zh-CN"),
		field.String("timezone").Default("Asia/Shanghai"),
		field.JSON("metadata", map[string]interface{}{}).Optional(),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (UserProfile) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("profile").Field("user_id").Unique().Required(),
	}
}
