function splitPath(path) {
  return path.split('/').filter(Boolean);
}

function compilePath(path) {
  return splitPath(path).map((part) => {
    if (part.startsWith(':')) {
      return { name: part.slice(1), parameter: true };
    }
    return { value: part, parameter: false };
  });
}

export class Router {
  #routes = [];

  add(method, path, handler) {
    this.#routes.push({
      method: method.toUpperCase(),
      path: compilePath(path),
      handler,
    });
    return this;
  }

  get(path, handler) {
    return this.add('GET', path, handler);
  }

  match(method, path) {
    const requestedParts = splitPath(path);
    for (const route of this.#routes) {
      if (route.method !== method.toUpperCase() || route.path.length !== requestedParts.length) {
        continue;
      }

      const params = {};
      let matches = true;
      for (let index = 0; index < route.path.length; index += 1) {
        const part = route.path[index];
        if (part.parameter) {
          try {
            params[part.name] = decodeURIComponent(requestedParts[index]);
          } catch {
            matches = false;
            break;
          }
        } else if (part.value !== requestedParts[index]) {
          matches = false;
          break;
        }
      }

      if (matches) return { handler: route.handler, params };
    }
    return undefined;
  }
}

export function createRouter() {
  return new Router();
}
