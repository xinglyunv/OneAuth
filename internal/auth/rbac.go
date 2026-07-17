package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/permission"
	"github.com/identity-platform/internal/ent/role"
)

type RBACService struct {
	db *ent.Client
}

func NewRBACService(db *ent.Client) *RBACService {
	return &RBACService{db: db}
}

func (s *RBACService) CreateRole(ctx context.Context, name, description, scope string, orgID *uuid.UUID) (*ent.Role, error) {
	create := s.db.Role.Create().
		SetName(name).
		SetDescription(description).
		SetScope(role.Scope(scope))
	if orgID != nil {
		create = create.SetOrganizationID(*orgID)
	}
	return create.Save(ctx)
}

func (s *RBACService) ListRoles(ctx context.Context, page, size int) ([]*ent.Role, int, error) {
	offset := (page - 1) * size
	total, _ := s.db.Role.Query().Count(ctx)
	roles, err := s.db.Role.Query().
		Order(ent.Asc("name")).
		Limit(size).
		Offset(offset).
		All(ctx)
	return roles, total, err
}

func (s *RBACService) DeleteRole(ctx context.Context, id uuid.UUID) error {
	return s.db.Role.DeleteOneID(id).Exec(ctx)
}

func (s *RBACService) CreatePermission(ctx context.Context, name, description, resource, action string) (*ent.Permission, error) {
	return s.db.Permission.Create().
		SetName(name).
		SetDescription(description).
		SetResource(resource).
		SetAction(action).
		Save(ctx)
}

func (s *RBACService) ListPermissions(ctx context.Context) ([]*ent.Permission, error) {
	return s.db.Permission.Query().Order(ent.Asc("name")).All(ctx)
}

func (s *RBACService) DeletePermission(ctx context.Context, id uuid.UUID) error {
	return s.db.Permission.DeleteOneID(id).Exec(ctx)
}

func (s *RBACService) AssignPermissions(ctx context.Context, roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	_, err := s.db.Role.Query().Where(role.ID(roleID)).WithPermissions().Only(ctx)
	if err != nil {
		return err
	}
	perms, err := s.db.Permission.Query().Where(permission.IDIn(permissionIDs...)).All(ctx)
	if err != nil {
		return err
	}
	if len(perms) != len(permissionIDs) {
		return fmt.Errorf("some permissions not found")
	}
	_, err = s.db.Role.UpdateOneID(roleID).ClearPermissions().AddPermissions(perms...).Save(ctx)
	return err
}

func (s *RBACService) GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]*ent.Permission, error) {
	r, err := s.db.Role.Query().Where(role.ID(roleID)).WithPermissions().Only(ctx)
	if err != nil {
		return nil, err
	}
	return r.Edges.Permissions, nil
}
