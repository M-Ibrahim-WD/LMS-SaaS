import { BadRequestException } from "@nestjs/common";

const MAX_CONTENT_BYTES = 500_000;
const MAX_TEXT_LENGTH = 12_000;
const MAX_TREE_DEPTH = 8;
const MAX_CHILDREN_PER_CONTAINER = 80;
const MAX_HOMEPAGE_ITEMS = 400;
const ALLOWED_WIDGET_TYPES = new Set([
  "ABOUT_US",
  "WHY_US",
  "ABOUT_SITE",
  "TEXT_MEDIA",
  "HEADING",
  "TEXT",
  "BUTTON",
  "IMAGE_BLOCK",
  "VIDEO",
  "ICON",
  "FEATURED_INSTRUCTORS",
  "SPACER",
  "DIVIDER",
  "LIST",
  "CARD",
  "COURSE_LIST",
  "INSTRUCTOR_LIST",
  "TESTIMONIAL",
  "STATS",
  "FAQ"
]);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, path: string, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw new BadRequestException(`${path} is required.`);
    }
    return;
  }

  if (typeof value !== "string") {
    throw new BadRequestException(`${path} must be a string.`);
  }

  if (value.length > MAX_TEXT_LENGTH) {
    throw new BadRequestException(`${path} is too long.`);
  }
}

function assertStringArray(value: unknown, path: string) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    throw new BadRequestException(`${path} must be an array.`);
  }
  value.forEach((item, index) => assertString(item, `${path}[${index}]`, true));
}

function assertSafeImageReference(value: unknown, path: string) {
  assertString(value, path);
  if (typeof value !== "string" || !value) {
    return;
  }

  if (
    !value.startsWith("/") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("data:image/")
  ) {
    throw new BadRequestException(`${path} must be a valid image reference.`);
  }
}

function assertVisibility(value: unknown, path: string) {
  if (value === undefined) {
    return;
  }
  if (!isObject(value)) {
    throw new BadRequestException(`${path} must be an object.`);
  }

  ["desktop", "tablet", "mobile"].forEach((device) => {
    const deviceValue = value[device];
    if (deviceValue !== undefined && typeof deviceValue !== "boolean") {
      throw new BadRequestException(`${path}.${device} must be a boolean.`);
    }
  });
}

function validateWidget(widget: unknown, path: string) {
  if (!isObject(widget)) {
    throw new BadRequestException(`${path} must be an object.`);
  }

  assertString(widget.id, `${path}.id`, true);
  assertString(widget.type, `${path}.type`, true);

  if (typeof widget.type !== "string" || !ALLOWED_WIDGET_TYPES.has(widget.type)) {
    throw new BadRequestException(`${path}.type is not a supported homepage widget.`);
  }

  if (widget.hidden !== undefined && typeof widget.hidden !== "boolean") {
    throw new BadRequestException(`${path}.hidden must be a boolean.`);
  }

  assertVisibility(widget.visibility, `${path}.visibility`);
  assertString(widget.title, `${path}.title`);
  assertString(widget.subtitle, `${path}.subtitle`);
  assertString(widget.body, `${path}.body`);
  assertString(widget.content, `${path}.content`);
  assertString(widget.label, `${path}.label`);
  assertString(widget.href, `${path}.href`);
  assertString(widget.caption, `${path}.caption`);
  assertString(widget.videoUrl, `${path}.videoUrl`);
  assertStringArray(widget.bullets, `${path}.bullets`);
  assertStringArray(widget.items, `${path}.items`);
  assertSafeImageReference(widget.imageUrl, `${path}.imageUrl`);
  assertSafeImageReference(widget.avatarUrl, `${path}.avatarUrl`);
}

function validateElement(element: unknown, path: string, depth: number, counter: { count: number }) {
  counter.count += 1;
  if (counter.count > MAX_HOMEPAGE_ITEMS) {
    throw new BadRequestException("Homepage content contains too many items.");
  }

  if (!isObject(element)) {
    throw new BadRequestException(`${path} must be an object.`);
  }

  if (element.type === "CONTAINER") {
    validateContainer(element, path, depth, counter);
    return;
  }

  validateWidget(element, path);
}

function validateContainer(container: JsonObject, path: string, depth: number, counter: { count: number }) {
  if (depth > MAX_TREE_DEPTH) {
    throw new BadRequestException("Homepage containers are nested too deeply.");
  }

  assertString(container.id, `${path}.id`, true);
  if (container.hidden !== undefined && typeof container.hidden !== "boolean") {
    throw new BadRequestException(`${path}.hidden must be a boolean.`);
  }
  assertVisibility(container.visibility, `${path}.visibility`);
  assertSafeImageReference(container.backgroundImage, `${path}.backgroundImage`);

  if (!Array.isArray(container.children)) {
    throw new BadRequestException(`${path}.children must be an array.`);
  }
  if (container.children.length > MAX_CHILDREN_PER_CONTAINER) {
    throw new BadRequestException(`${path}.children contains too many items.`);
  }

  container.children.forEach((child, index) => {
    validateElement(child, `${path}.children[${index}]`, depth + 1, counter);
  });
}

function validateLegacyRows(rows: unknown) {
  if (rows === undefined) {
    return;
  }
  if (!Array.isArray(rows)) {
    throw new BadRequestException("Homepage rows must be an array.");
  }

  rows.forEach((row, rowIndex) => {
    if (!isObject(row)) {
      throw new BadRequestException(`rows[${rowIndex}] must be an object.`);
    }
    assertString(row.id, `rows[${rowIndex}].id`, true);
    assertVisibility(row.visibility, `rows[${rowIndex}].visibility`);

    const slots = Array.isArray(row.slots) ? row.slots : [];
    slots.forEach((slot, slotIndex) => {
      if (slot !== null) {
        validateWidget(slot, `rows[${rowIndex}].slots[${slotIndex}]`);
      }
    });

    if (row.columnsData !== undefined && !Array.isArray(row.columnsData)) {
      throw new BadRequestException(`rows[${rowIndex}].columnsData must be an array.`);
    }
  });
}

export function validateHomepageContent(content: unknown) {
  if (!isObject(content)) {
    throw new BadRequestException("Homepage content must be an object.");
  }

  const contentBytes = Buffer.byteLength(JSON.stringify(content), "utf8");
  if (contentBytes > MAX_CONTENT_BYTES) {
    throw new BadRequestException("Homepage content is too large.");
  }

  validateLegacyRows(content.rows);

  if (content.containers === undefined) {
    return;
  }
  if (!Array.isArray(content.containers)) {
    throw new BadRequestException("Homepage containers must be an array.");
  }

  const counter = { count: 0 };
  content.containers.forEach((container, index) => {
    if (!isObject(container) || container.type !== "CONTAINER") {
      throw new BadRequestException(`containers[${index}] must be a container.`);
    }
    validateContainer(container, `containers[${index}]`, 1, counter);
  });
}
