const PRICING_DOC_URL = 'https://developers.openai.com/codex/pricing';
const USAGE_DASHBOARD_URL = 'https://chatgpt.com/codex/settings/usage';
const COMMON_LIMIT_NOTE = 'Current Codex limits use a shared 5-hour window for local messages and cloud tasks. Additional weekly caps may also apply.';

function envelope(localMessages, cloudTasks, codeReviews) {
  return {
    localMessages,
    cloudTasks,
    codeReviews,
    usageWindow: '5 hours'
  };
}

export const PLAN_PRESETS = {
  plus: {
    id: 'plus',
    label: 'ChatGPT Plus',
    family: 'chatgpt',
    summary: 'Personal profile with included Codex usage and optional extra credits.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: COMMON_LIMIT_NOTE,
    limits: envelope(
      {
        'GPT-5.4': '20-100',
        'GPT-5.4-mini': '60-350',
        'GPT-5.3-Codex': '30-150'
      },
      {
        'GPT-5.3-Codex': '10-60'
      },
      {
        'GPT-5.3-Codex': '20-50'
      }
    )
  },
  pro_100: {
    id: 'pro_100',
    label: 'ChatGPT Pro $100',
    family: 'chatgpt',
    summary: 'Higher included Codex usage with the current 10x launch promo.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: `${COMMON_LIMIT_NOTE} OpenAI currently documents boosted Pro $100 limits through May 31, 2026.`,
    limits: envelope(
      {
        'GPT-5.4': '100-500',
        'GPT-5.4-mini': '300-1750',
        'GPT-5.3-Codex': '150-750'
      },
      {
        'GPT-5.3-Codex': '50-300'
      },
      {
        'GPT-5.3-Codex': '100-250'
      }
    )
  },
  pro_200: {
    id: 'pro_200',
    label: 'ChatGPT Pro $200',
    family: 'chatgpt',
    summary: 'Largest fixed consumer Codex envelope; currently running with elevated promo limits.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: `${COMMON_LIMIT_NOTE} OpenAI currently documents boosted Pro $200 limits through May 31, 2026.`,
    limits: envelope(
      {
        'GPT-5.4': '400-2000',
        'GPT-5.4-mini': '1200-7000',
        'GPT-5.3-Codex': '600-3000'
      },
      {
        'GPT-5.3-Codex': '200-1200'
      },
      {
        'GPT-5.3-Codex': '400-1000'
      }
    )
  },
  business: {
    id: 'business',
    label: 'ChatGPT Business',
    family: 'chatgpt',
    summary: 'Workspace profile with per-seat usage and optional flexible credits.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: `${COMMON_LIMIT_NOTE} Business can extend usage with workspace credits.`,
    limits: envelope(
      {
        'GPT-5.4': '20-100',
        'GPT-5.4-mini': '60-350',
        'GPT-5.3-Codex': '30-150'
      },
      {
        'GPT-5.3-Codex': '10-60'
      },
      {
        'GPT-5.3-Codex': '20-50'
      }
    )
  },
  enterprise_edu: {
    id: 'enterprise_edu',
    label: 'Enterprise / Edu',
    family: 'chatgpt',
    summary: 'Org-managed profile. Flexible pricing removes fixed limits; otherwise most per-seat limits follow Plus.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: 'OpenAI documents no fixed limits for Enterprise and Edu when flexible pricing is enabled. Without flexible pricing, most per-seat usage follows Plus.',
    limits: envelope(
      {
        'GPT-5.4': 'Varies by workspace',
        'GPT-5.4-mini': 'Varies by workspace',
        'GPT-5.3-Codex': 'Varies by workspace'
      },
      {
        'GPT-5.3-Codex': 'Varies by workspace'
      },
      {
        'GPT-5.3-Codex': 'Varies by workspace'
      }
    )
  },
  api: {
    id: 'api',
    label: 'API key',
    family: 'api',
    summary: 'Usage-based Codex access for automation and CI, billed per token.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: 'https://platform.openai.com/usage',
    notes: 'API key sign-in uses standard API pricing and does not include cloud tasks or code reviews.',
    limits: envelope(
      {
        'GPT-5.4': 'Usage-based',
        'GPT-5.4-mini': 'Usage-based',
        'GPT-5.3-Codex': 'Usage-based'
      },
      {},
      {}
    )
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    family: 'custom',
    summary: 'Use this when the plan or quota model is non-standard.',
    referenceUrl: PRICING_DOC_URL,
    usageDashboardUrl: USAGE_DASHBOARD_URL,
    notes: 'The board will keep local auth state and any manual limits you enter.',
    limits: envelope({}, {}, {})
  }
};

export function getPlanPreset(planId) {
  return PLAN_PRESETS[planId] ?? PLAN_PRESETS.custom;
}

export function listPlanPresets() {
  return Object.values(PLAN_PRESETS);
}

export { PRICING_DOC_URL, USAGE_DASHBOARD_URL };
