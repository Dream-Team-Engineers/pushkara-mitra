import type { PlaceCategory } from '../../shared/data/places';
import type { IconName } from '../../shared/ui/Icon';

/** Icon for each place category, shared by the map pins, the chips and the list. */
export const PLACE_ICON: Readonly<Record<PlaceCategory, IconName>> = {
  ghat: 'ghats',
  temple: 'temple',
  hospital: 'hospital',
};
