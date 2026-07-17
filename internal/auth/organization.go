package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/organization"
	"github.com/identity-platform/internal/ent/organizationmember"
)

type OrganizationService struct {
	db *ent.Client
}

func NewOrganizationService(db *ent.Client) *OrganizationService {
	return &OrganizationService{db: db}
}

func (s *OrganizationService) Create(ctx context.Context, name, slug, description, domain string, ownerID uuid.UUID) (*ent.Organization, error) {
	return s.db.Organization.Create().
		SetName(name).
		SetSlug(slug).
		SetDescription(description).
		SetDomain(domain).
		SetOwnerID(ownerID).
		Save(ctx)
}

func (s *OrganizationService) Update(ctx context.Context, id uuid.UUID, name, description, domain string) (*ent.Organization, error) {
	update := s.db.Organization.UpdateOneID(id)
	if name != "" {
		update = update.SetName(name)
	}
	if description != "" {
		update = update.SetDescription(description)
	}
	if domain != "" {
		update = update.SetDomain(domain)
	}
	return update.Save(ctx)
}

func (s *OrganizationService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.db.Organization.DeleteOneID(id).Exec(ctx)
}

func (s *OrganizationService) List(ctx context.Context, page, size int) ([]*ent.Organization, int, error) {
	offset := (page - 1) * size
	total, _ := s.db.Organization.Query().Count(ctx)
	orgs, err := s.db.Organization.Query().
		Order(ent.Desc("created_at")).
		Limit(size).
		Offset(offset).
		All(ctx)
	return orgs, total, err
}

func (s *OrganizationService) Get(ctx context.Context, id uuid.UUID) (*ent.Organization, error) {
	return s.db.Organization.Query().Where(organization.ID(id)).Only(ctx)
}

func (s *OrganizationService) AddMember(ctx context.Context, orgID, userID uuid.UUID, role string) (*ent.OrganizationMember, error) {
	existing, _ := s.db.OrganizationMember.Query().
		Where(organizationmember.OrganizationID(orgID), organizationmember.UserID(userID)).
		Count(ctx)
	if existing > 0 {
		return nil, fmt.Errorf("成员已存在")
	}
	return s.db.OrganizationMember.Create().
		SetOrganizationID(orgID).
		SetUserID(userID).
		SetRole(organizationmember.Role(role)).
		Save(ctx)
}

func (s *OrganizationService) RemoveMember(ctx context.Context, orgID, userID uuid.UUID) error {
	n, err := s.db.OrganizationMember.Delete().
		Where(
			organizationmember.OrganizationID(orgID),
			organizationmember.UserID(userID),
		).
		Exec(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("member not found")
	}
	return nil
}

func (s *OrganizationService) ListMembers(ctx context.Context, orgID uuid.UUID) ([]*ent.OrganizationMember, error) {
	return s.db.OrganizationMember.Query().
		Where(organizationmember.OrganizationID(orgID)).
		Order(ent.Asc("created_at")).
		All(ctx)
}
