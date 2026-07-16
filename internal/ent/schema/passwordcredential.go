package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

type PasswordCredential struct {
	ent.Schema
}

func (PasswordCredential) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}).Unique(),
		field.String("password_hash").NotEmpty().Sensitive(),
		field.String("algorithm").Default("argon2id"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
		field.Time("last_changed_at").Default(time.Now),
	}
}

func (PasswordCredential) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("password_credential").Field("user_id").Unique().Required(),
	}
}
