package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type SigningKey struct {
	ent.Schema
}

func (SigningKey) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("kid").Unique().NotEmpty(),
		field.String("algorithm").Default("RS256"),
		field.Text("public_key").NotEmpty(),
		field.Text("private_key_encrypted").NotEmpty().Sensitive(),
		field.Enum("status").Values("active", "rotated", "expired").Default("active"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("expires_at"),
	}
}

func (SigningKey) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("kid").Unique(),
		index.Fields("status"),
	}
}
