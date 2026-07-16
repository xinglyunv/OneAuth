package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type OAuthClient struct {
	ent.Schema
}

func (OAuthClient) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("client_id").Unique().NotEmpty(),
		field.String("name").NotEmpty(),
		field.Text("description").Optional(),
		field.Enum("client_type").Values("confidential", "public").Default("confidential"),
		field.String("client_secret_hash").Optional().Sensitive(),
		field.Enum("status").Values("active", "disabled").Default("active"),
		field.UUID("created_by", uuid.UUID{}),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
	}
}

func (OAuthClient) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("redirect_uris", OAuthRedirectURI.Type),
		edge.To("consents", OAuthConsent.Type),
	}
}

func (OAuthClient) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("client_id").Unique(),
		index.Fields("created_by"),
	}
}
