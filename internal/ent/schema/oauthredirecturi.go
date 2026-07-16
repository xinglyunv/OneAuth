package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type OAuthRedirectURI struct {
	ent.Schema
}

func (OAuthRedirectURI) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.UUID("client_id", uuid.UUID{}),
		field.String("redirect_uri").NotEmpty(),
		field.Time("created_at").Default(time.Now).Immutable(),
	}
}

func (OAuthRedirectURI) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("oauth_client", OAuthClient.Type).Ref("redirect_uris").Field("client_id").Unique().Required(),
	}
}

func (OAuthRedirectURI) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("client_id"),
		index.Fields("client_id", "redirect_uri").Unique(),
	}
}
