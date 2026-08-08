/** Ported from nazemi-design `src/data/projects.js`. Logos are paths under `public/seed/`. */
const projectNerust = 'project-nerust.png'
const projectFlowmakers = 'project-flowmakers.png'
const projectNanebi = 'project-nanebi.png'
const projectSymbiocen = 'project-symbiocen.png'

export type ProjectLink = {
  label: string
  href?: string
  variant?: string
}

export type ProjectSeed = {
  slug: string
  color: 'nerust' | 'blue' | 'turquoise' | 'green'
  logo: string
  logoClass?: string
  title: string
  description: string
  links: ProjectLink[]
  className?: string
  bodyHtml?: string
}

export function getProjectHref(slug: string) {
  return `/projekty/${slug}`
}

export function getProjectBySlug(slug: string) {
  return projectPages.find((project) => project.slug === slug) ?? null
}

export const projectPages: (ProjectSeed & { href: string })[] = ([
  {
    slug: 'nerust',
    color: 'nerust',
    logo: projectNerust,
    logoClass: 'h-[95px] w-[150px]',
    title: 'Nerůst',
    description:
      'Otevíráním tématu nerůstu zpochybňujeme hluboce zakořeněné předpoklady o fungování našich systémů a zároveň pomáháme vykreslovat jinou vizi: ekonomiku, jejímž cílem není růst a zisk, ale dobrý život pro všechny v rámci planetárních mezí.',
    links: [
      { label: 'Na web Nerůstu', variant: 'outline', href: 'https://nerust.cz' },
    ],
  },
  {
    slug: 'flow-makers',
    color: 'blue',
    logo: projectFlowmakers,
    logoClass: 'h-[62px] w-[151px]',
    title: 'Flow Makers',
    description:
      'Exercitation velit aliquip elit do. Laborum elit excepteur ut consequat. Irure anim enim enim pariatur excepteur qui ea sit aliquip sint nulla nisi reprehenderit dolor enim. Cillum consequat reprehenderit adipisicing dolore elit. Exercitation velit aliquip elit do.',
    links: [{ label: 'Na web Flow Makers', variant: 'outline', href: 'https://flowmakers.cz' }],
  },
  {
    slug: 'nanebi',
    color: 'turquoise',
    logo: projectNanebi,
    logoClass: 'h-[150px] w-[150px]',
    title: 'NaNebi',
    description:
      'Exercitation velit aliquip elit do. Laborum elit excepteur ut consequat. Irure anim enim enim pariatur excepteur qui ea sit aliquip sint nulla nisi reprehenderit dolor enim. Cillum consequat reprehenderit adipisicing dolore elit. Exercitation velit aliquip elit do.',
    links: [{ label: 'Na web NaNebi', variant: 'outline', href: 'https://nanebi.cz' }],
    className: 'min-h-[210px]',
  },
  {
    slug: 'generace-symbiocen',
    color: 'green',
    logo: projectSymbiocen,
    logoClass: 'h-[68px] w-[150px]',
    title: 'Generace Symbiocén',
    description:
      'Exercitation velit aliquip elit do. Laborum elit excepteur ut consequat. Irure anim enim enim pariatur excepteur qui ea sit aliquip sint nulla nisi reprehenderit dolor enim. Cillum consequat reprehenderit adipisicing dolore elit. Exercitation velit aliquip elit do.',
    links: [
      { label: 'Na web Generace Symbiocén', variant: 'outline', href: 'https://symbiocen.cz' },
    ],
  },
] as ProjectSeed[]).map((project) => ({
  ...project,
  href: getProjectHref(project.slug),
}))

export function projectHeaderLinks(project: ProjectSeed & { href: string }): ProjectLink[] {
  const detailLink = {
    label: `Více o ${project.title}`,
    href: project.href,
    variant: project.color === 'nerust' ? 'outline-sky' : 'outline',
  }

  return [detailLink, ...project.links]
}

/** Homepage project tiles — include internal detail link alongside external CTAs */
export const homepageProjects = projectPages.map((project) => ({
  color: project.color,
  logo: project.logo,
  logoClass: project.logoClass,
  title: project.title,
  description: project.description,
  className: project.className,
  links: projectHeaderLinks(project),
}))
