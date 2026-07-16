package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type EmailVerificationToken struct {
	ent.Schema
}

func (EmailVerificationToken) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.String("token").Unique().NotEmpty(),
		field.Time("expires_at"),
		field.Bool("used").Default(false),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (EmailVerificationToken) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("token").Unique(),
		index.Fields("user_id"),
	}
}
