import type { OnChainOrganization } from './wire';
import type { Organization } from '@/domain';
import { asOrganizationId, asAddress } from '@/domain';

export function mapToOrganization(
  id: number,
  onChain: OnChainOrganization,
  memberCount: number,
): Organization {
  return {
    id: asOrganizationId(id),
    name: onChain.name,
    description: onChain.description,
    organizer: asAddress(onChain.organizer),
    memberCount,
  };
}
