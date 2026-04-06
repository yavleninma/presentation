import nextCore from "eslint-config-next/core-web-vitals";

const nextConfigs = Array.isArray(nextCore) ? nextCore : [nextCore];

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**"],
  },
  ...nextConfigs,
];

export default eslintConfig;
