import * as path from 'path';

const generatedPartPatterns = [
  /\.g\.dart$/i,
  /\.freezed\.dart$/i,
  /\.gr\.dart$/i,
  /\.mocks\.dart$/i,
  /\.config\.dart$/i,
  /\.mapper\.dart$/i,
  /\.graphql\.dart$/i,
  /\.gql\.dart$/i,
  /\.chopper\.dart$/i,
  /\.swagger\.dart$/i,
];

const heuristicSuffixes = [
  '.g.dart',
  '.freezed.dart',
  '.gr.dart',
  '.config.dart',
  '.mocks.dart',
];

export interface BuildFilterResolverParams {
  documentPath: string;
  documentText: string;
  workspaceRoot: string;
  fileExists(path: string): boolean;
}

export interface BuildFilterResolution {
  relativeDocumentPath: string;
  buildFilters: string[];
  missingFilters: string[];
}

export function resolveBuildFilters(
  params: BuildFilterResolverParams
): BuildFilterResolution | null {
  const { documentPath, documentText, workspaceRoot, fileExists } = params;

  const relativePath = path.relative(workspaceRoot, documentPath);
  if (relativePath.startsWith('..')) {
    return null;
  }

  const normalizedRelativePath = normalize(relativePath);
  const basePath = normalizedRelativePath.replace(/\.dart$/i, '');

  const partFilters = new Set<string>();
  const missingPartFilters = new Set<string>();
  const partRegex = /part\s+['"]([^'"]+)['"];?/g;
  let match: RegExpExecArray | null;

  const documentDir = path.dirname(documentPath);

  while ((match = partRegex.exec(documentText)) !== null) {
    const partPath = match[1];
    if (!generatedPartPatterns.some((pattern) => pattern.test(partPath))) {
      continue;
    }

    const resolvedPartPath = path.resolve(documentDir, partPath);
    const relativePartPath = path.relative(workspaceRoot, resolvedPartPath);
    if (relativePartPath.startsWith('..')) {
      continue;
    }

    const normalizedPart = normalize(relativePartPath);
    if (fileExists(resolvedPartPath)) {
      partFilters.add(normalizedPart);
    } else {
      missingPartFilters.add(normalizedPart);
    }
  }

  for (const suffix of heuristicSuffixes) {
    const candidate = `${basePath}${suffix}`;
    const absolutePath = path.join(workspaceRoot, candidate.split('/').join(path.sep));
    if (fileExists(absolutePath)) {
      partFilters.add(candidate);
    }
  }

  const buildFilters = [...partFilters, ...missingPartFilters];
  if (buildFilters.length === 0) {
    return {
      relativeDocumentPath: normalizedRelativePath,
      buildFilters: [],
      missingFilters: [...missingPartFilters],
    };
  }

  return {
    relativeDocumentPath: normalizedRelativePath,
    buildFilters: [...new Set(buildFilters)],
    missingFilters: [...missingPartFilters],
  };
}

function normalize(target: string): string {
  return target.split(path.sep).join('/');
}
