package types

// ActorType identifica el nivel jerárquico del usuario autenticado (superadmins, admins, employees).
type ActorType string

const (
	ActorSuperadmin ActorType = "superadmin"
	ActorAdmin      ActorType = "admin"
	ActorEmployee   ActorType = "employee"
)

// SuperadminAccessLevel coincide con superadmins.access_level ('developer' | 'root' | 'support').
type SuperadminAccessLevel string

const (
	AccessDeveloper SuperadminAccessLevel = "developer"
	AccessRoot      SuperadminAccessLevel = "root"
	AccessSupport   SuperadminAccessLevel = "support"
)

// DocumentType tipos de identificación válidos para mayores de edad y empresas ('CC' | 'CE' | 'NIT' | 'PA').
type DocumentType string

const (
	DocCC  DocumentType = "CC"
	DocCE  DocumentType = "CE"
	DocNIT DocumentType = "NIT"
	DocPA  DocumentType = "PA"
)

// WorkModality coincide con employees.work_modality ('onsite' | 'remote' | 'hybrid').
type WorkModality string

const (
	ModalityOnsite WorkModality = "onsite"
	ModalityRemote WorkModality = "remote"
	ModalityHybrid WorkModality = "hybrid"
)

// EmploymentStatus coincide con employees.employment_status ('active' | 'leave' | 'retired').
type EmploymentStatus string

const (
	EmploymentActive  EmploymentStatus = "active"
	EmploymentLeave   EmploymentStatus = "leave"
	EmploymentRetired EmploymentStatus = "retired"
)

// EmployeeStatus coincide con employees.status ('active' | 'inactive' | 'blocked').
type EmployeeStatus string

const (
	EmployeeActive   EmployeeStatus = "active"
	EmployeeInactive EmployeeStatus = "inactive"
	EmployeeBlocked  EmployeeStatus = "blocked"
)

