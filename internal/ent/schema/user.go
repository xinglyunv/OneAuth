package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
	"github.com/google/uuid"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).Default(uuid.New).Immutable(),
		field.String("email").Unique().NotEmpty(),
		field.String("username").Unique().Optional(),
		field.String("phone").Optional(),
		field.Bool("email_verified").Default(false),
		field.Bool("mfa_enabled").Default(false),
		field.String("mfa_secret").Optional().Sensitive(),
		field.Enum("status").Values("active", "disabled", "pending").Default("pending"),
		field.Time("created_at").Default(time.Now).Immutable(),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
		field.Time("deleted_at").Optional().Nillable(),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("password_credential", PasswordCredential.Type).Unique(),
		edge.To("profile", UserProfile.Type).Unique(),
		edge.To("sessions", Session.Type),
		edge.To("devices", Device.Type),
		edge.To("audit_logs", AuditLog.Type),
		edge.To("oauth_consents", OAuthConsent.Type),
		edge.To("refresh_tokens", RefreshToken.Type),
		edge.To("personal_tokens", PersonalToken.Type),
		edge.To("backup_codes", BackupCode.Type),
		edge.To("emails", UserEmail.Type),
		edge.To("phones", UserPhone.Type),
		edge.To("roles", UserRole.Type),
	}
}

func (User) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("email").Unique(),
		index.Fields("username").Unique(),
		index.Fields("status"),
	}
}
