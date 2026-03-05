export interface BmcSection {
  id: string;
  title: string;
  description: string;
  questions: BmcQuestion[];
}

export interface BmcQuestion {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'list';
}

export const BMC_SECTIONS: BmcSection[] = [
  {
    id: 'segments_clients',
    title: 'Segments de Clients',
    description: 'Pour qui créez-vous de la valeur ? Qui sont vos clients les plus importants ?',
    questions: [
      { id: 'target_clients', label: 'Qui sont vos clients cibles ?', placeholder: 'Ex: PME du secteur agroalimentaire en Côte d\'Ivoire...', type: 'textarea' },
      { id: 'client_characteristics', label: 'Quelles sont les caractéristiques de vos clients ?', placeholder: 'Ex: entreprises de 10-50 employés, CA > 50M FCFA...', type: 'textarea' },
      { id: 'client_needs', label: 'Quels sont leurs besoins principaux ?', placeholder: 'Ex: accès au financement, modernisation des équipements...', type: 'textarea' },
    ],
  },
  {
    id: 'proposition_valeur',
    title: 'Proposition de Valeur',
    description: 'Quelle valeur apportez-vous à vos clients ? Quel problème résolvez-vous ?',
    questions: [
      { id: 'value_offered', label: 'Quelle valeur offrez-vous à vos clients ?', placeholder: 'Ex: réduction des coûts de production de 30%...', type: 'textarea' },
      { id: 'problems_solved', label: 'Quels problèmes résolvez-vous ?', placeholder: 'Ex: manque d\'accès aux matières premières de qualité...', type: 'textarea' },
      { id: 'products_services', label: 'Quels produits/services proposez-vous ?', placeholder: 'Ex: briques écologiques, formation, conseil...', type: 'textarea' },
    ],
  },
  {
    id: 'canaux',
    title: 'Canaux de Distribution',
    description: 'Comment atteignez-vous vos clients ? Comment livrez-vous votre proposition de valeur ?',
    questions: [
      { id: 'channels', label: 'Par quels canaux atteignez-vous vos clients ?', placeholder: 'Ex: vente directe, distributeurs, e-commerce...', type: 'textarea' },
      { id: 'best_channels', label: 'Quels canaux fonctionnent le mieux ?', placeholder: 'Ex: le bouche-à-oreille et les salons professionnels...', type: 'textarea' },
    ],
  },
  {
    id: 'relations_clients',
    title: 'Relations Clients',
    description: 'Quel type de relation vos clients attendent-ils ? Comment les fidélisez-vous ?',
    questions: [
      { id: 'relationship_type', label: 'Quel type de relation maintenez-vous ?', placeholder: 'Ex: assistance personnelle, self-service, communauté...', type: 'textarea' },
      { id: 'retention_strategy', label: 'Comment fidélisez-vous vos clients ?', placeholder: 'Ex: programme de fidélité, suivi personnalisé...', type: 'textarea' },
    ],
  },
  {
    id: 'sources_revenus',
    title: 'Sources de Revenus',
    description: 'Pour quelle valeur vos clients sont-ils prêts à payer ? Comment paient-ils ?',
    questions: [
      { id: 'revenue_sources', label: 'Quelles sont vos sources de revenus ?', placeholder: 'Ex: vente de produits, abonnements, licences...', type: 'textarea' },
      { id: 'pricing_model', label: 'Comment fixez-vous vos prix ?', placeholder: 'Ex: prix fixe, négociation, enchères...', type: 'textarea' },
      { id: 'revenue_figures', label: 'Quel est votre chiffre d\'affaires (3 dernières années) ?', placeholder: 'Ex: 2023: 42M FCFA, 2024: 85M FCFA, 2025: 156M FCFA', type: 'text' },
    ],
  },
  {
    id: 'ressources_cles',
    title: 'Ressources Clés',
    description: 'Quelles ressources sont indispensables à votre modèle économique ?',
    questions: [
      { id: 'physical_resources', label: 'Ressources physiques (locaux, équipements...)', placeholder: 'Ex: usine de 500m², 3 machines de recyclage...', type: 'textarea' },
      { id: 'human_resources', label: 'Ressources humaines', placeholder: 'Ex: 35 employés, 5 ingénieurs, 150 collecteurs partenaires...', type: 'textarea' },
      { id: 'intellectual_resources', label: 'Ressources intellectuelles (brevets, marques...)', placeholder: 'Ex: brevet sur le procédé de recyclage, marque déposée...', type: 'textarea' },
    ],
  },
  {
    id: 'activites_cles',
    title: 'Activités Clés',
    description: 'Quelles activités sont essentielles pour faire fonctionner votre modèle ?',
    questions: [
      { id: 'key_activities', label: 'Quelles sont vos activités principales ?', placeholder: 'Ex: collecte, transformation, commercialisation...', type: 'textarea' },
      { id: 'differentiating_activities', label: 'Quelles activités vous différencient ?', placeholder: 'Ex: R&D sur les matériaux recyclés, formation des collecteurs...', type: 'textarea' },
    ],
  },
  {
    id: 'partenaires_cles',
    title: 'Partenaires Clés',
    description: 'Qui sont vos partenaires et fournisseurs stratégiques ?',
    questions: [
      { id: 'key_partners', label: 'Qui sont vos partenaires clés ?', placeholder: 'Ex: municipalités, ONG, fournisseurs de ciment...', type: 'textarea' },
      { id: 'partner_contributions', label: 'Que vous apportent-ils ?', placeholder: 'Ex: approvisionnement en matières premières, accès aux marchés publics...', type: 'textarea' },
    ],
  },
  {
    id: 'structure_couts',
    title: 'Structure des Coûts',
    description: 'Quels sont les coûts les plus importants de votre modèle ?',
    questions: [
      { id: 'main_costs', label: 'Quels sont vos principaux postes de coûts ?', placeholder: 'Ex: matières premières (40%), salaires (30%), transport (15%)...', type: 'textarea' },
      { id: 'cost_optimization', label: 'Comment optimisez-vous vos coûts ?', placeholder: 'Ex: économies d\'échelle, mutualisation des transports...', type: 'textarea' },
    ],
  },
];
