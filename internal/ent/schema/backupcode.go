package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type BackupCode struct {
	ent.Schema
}

func (BackupCode) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("code_hash").NotEmpty().Sensitive(),
		field.Bool("used").Default(false),
		field.Time("used_at").Optional().Nillable(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (BackupCode) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("backup_codes").Field("user_id").Unique().Required(),
	}
}

func (BackupCode) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("user_id", "code_hash").Unique(),
	}
}
