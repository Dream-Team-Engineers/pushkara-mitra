import type { Resource } from '../../shared/data/resource';
import type { PublicInformation } from '../../shared/data/publicInformation';
import { informationResource } from '../../shared/data/resources';
import { isEnabled } from '../../shared/flags/flags';
import { locale, t } from '../../shared/i18n/i18n';
import { ResourceView } from '../../shared/ui/ResourceView';

/** Renders reviewed app information from the server. Nothing is shown when none is published. */
export function PublishedInformationView({
  resource,
}: {
  readonly resource: Resource<PublicInformation | null>;
}) {
  return (
    <ResourceView
      resource={resource}
      render={(document) =>
        document === null ? null : (
          <section class="published" aria-labelledby="published-title">
            <h3 id="published-title">{t('settings.about.published')}</h3>
            <p>
              <strong>{document.title}</strong>
            </p>
            {document.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        )
      }
    />
  );
}

/** Off until the route and copy are approved (flag `publishedInformation`). */
export function PublishedInformation({
  enabled = isEnabled('publishedInformation'),
}: {
  readonly enabled?: boolean;
}) {
  if (!enabled) return null;
  return <PublishedInformationView resource={informationResource(locale.value)} />;
}
