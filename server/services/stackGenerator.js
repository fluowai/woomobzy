import yaml from 'js-yaml';
import crypto from 'crypto';

/**
 * Service to generate secure, typed Docker Compose / Swarm stacks
 */
export class StackGeneratorService {
  /**
   * Generates a docker-compose.yml based on license parameters.
   * Uses js-yaml to safely build the structure, avoiding string concatenation vulnerabilities.
   */
  static generateStack(config) {
    const {
      product,
      version,
      licenseId,
      instanceId,
      domain,
      includeTraefik,
      includeRedis,
      includeWhatsapp,
      includeAi
    } = config;

    // Validate essential inputs
    if (!product || !version || !licenseId || !domain) {
      throw new Error("Missing required stack parameters");
    }

    const services = {};
    const volumes = {};
    const networks = {
      woo_network: { driver: 'overlay' }
    };

    // Base API Service
    services.api = {
      image: `ghcr.io/wootech/${product}-api:${version}`,
      environment: {
        NODE_ENV: 'production',
        LICENSE_ID: licenseId,
        INSTANCE_ID: instanceId || crypto.randomUUID(),
        DOMAIN: domain,
        PORT: '3000'
      },
      networks: ['woo_network'],
      deploy: {
        replicas: 1,
        restart_policy: { condition: 'any' }
      }
    };

    // Base Frontend Service
    services.frontend = {
      image: `ghcr.io/wootech/${product}-frontend:${version}`,
      environment: {
        VITE_API_URL: `https://api.${domain}`,
      },
      networks: ['woo_network'],
      labels: includeTraefik ? [
        "traefik.enable=true",
        `traefik.http.routers.${product}_frontend.rule=Host(\`${domain}\`)`,
        `traefik.http.routers.${product}_frontend.entrypoints=websecure`,
        `traefik.http.routers.${product}_frontend.tls.certresolver=letsencryptresolver`
      ] : []
    };

    if (includeRedis) {
      services.redis = {
        image: 'redis:7-alpine',
        networks: ['woo_network'],
        volumes: ['redis_data:/data']
      };
      volumes.redis_data = {};
      services.api.environment.REDIS_URL = 'redis://redis:6379';
    }

    if (includeWhatsapp) {
      services.whatsapp = {
        image: `ghcr.io/wootech/${product}-whatsapp:${version}`,
        networks: ['woo_network'],
        volumes: ['whatsapp_sessions:/app/.sessions']
      };
      volumes.whatsapp_sessions = {};
    }

    if (includeAi) {
      services.ai_worker = {
        image: `ghcr.io/wootech/${product}-ai:${version}`,
        networks: ['woo_network']
      };
    }

    const stack = {
      version: '3.8',
      services,
      networks,
      volumes: Object.keys(volumes).length > 0 ? volumes : undefined
    };

    // Use js-yaml to dump object securely to string
    return yaml.dump(stack, { indent: 2, noRefs: true });
  }
}
