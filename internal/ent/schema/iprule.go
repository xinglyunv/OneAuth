package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type IPRule struct {
	ent.Schema
}

func (IPRule) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("ip_or_cidr").NotEmpty(),
		field.Enum("type").Values("blacklist", "whitelist").Default("blacklist"),
		field.Text("reason").Optional(),
		field.Bool("is_active").Default(true),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (IPRule) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("ip_or_cidr"),
		index.Fields("type", "is_active"),
	}
}
