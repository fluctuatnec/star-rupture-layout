import { describe, it, expect } from "vitest";
import type { Position, BuildingNode } from "../../core/types";

describe("Core Types", () => {
  it("should create a valid Position", () => {
    const position: Position = { x: 10, y: 20 };
    expect(position.x).toBe(10);
    expect(position.y).toBe(20);
  });

  it("should create a valid BuildingNode", () => {
    const building: BuildingNode = {
      id: "test-building-1",
      type: "building",
      position: { x: 0, y: 0 },
      rotation: 0,
      ports: [],
      buildingTypeId: "smelter",
      recipeId: "titanium_bar",
      size: 3,
      count: 1,
      actualCount: 1,
      powerPerUnit: 5,
      heatPerUnit: 3,
    };

    expect(building.type).toBe("building");
    expect(building.size).toBe(3);
    expect(building.buildingTypeId).toBe("smelter");
  });

  it("should support optional fields", () => {
    const position: Position = { x: 5, y: 10, z: 0 };
    expect(position.z).toBe(0);
  });
});
