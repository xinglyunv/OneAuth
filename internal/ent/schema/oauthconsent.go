package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type OAuthConsent struct {
	ent.Schema
}

func (OAuthConsent) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("user_id", uuid.UUID{}),
		field.UUID("client_id", uuid.UUID{}),
		field.JSON("scopes", []string{}),
		field.Enum("status").Values("approved", "revoked").Default("approved"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (OAuthConsent) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).Ref("oauth_consents").Field("user_id").Unique().Required(),
		edge.From("oauth_client", OAuthClient.Type).Ref("consents").Field("client_id").Unique().Required(),
	}
}

func (OAuthConsent) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("client_id"),
		index.Fields("user_id", "client_id").Unique(),
	}
}
