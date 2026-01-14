import { useState, useCallback } from "react";
import { ErrorSeverity } from "../../../utils/errors";
import { GROUP_COLORS } from "../types";

interface UseBuildingGroupsParams {
  selectedBuildingIds: Set<string>;
  setSelectedBuildingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  showToast: (message: string, severity: ErrorSeverity) => void;
}

export function useBuildingGroups({
  selectedBuildingIds,
  setSelectedBuildingIds,
  showToast,
}: UseBuildingGroupsParams) {
  // Building Groups state
  const [buildingGroups, setBuildingGroups] = useState<Map<string, Set<string>>>(
    new Map()
  ); // groupId -> buildingIds
  const [buildingToGroup, setBuildingToGroup] = useState<Map<string, string>>(
    new Map()
  ); // buildingId -> groupId

  // Get group color by index
  const getGroupColor = useCallback(
    (groupId: string): string => {
      const groupIds = Array.from(buildingGroups.keys());
      const index = groupIds.indexOf(groupId);
      return GROUP_COLORS[index % GROUP_COLORS.length];
    },
    [buildingGroups]
  );

  // Create a group from selected buildings
  const createGroup = useCallback(() => {
    if (selectedBuildingIds.size < 2) {
      showToast(
        "Select at least 2 buildings to create a group",
        ErrorSeverity.WARNING
      );
      return;
    }

    const groupId = `group-${Date.now()}`;
    const buildingIds = new Set(selectedBuildingIds);

    // Check if any selected buildings are already in a group
    const existingGroups = new Set<string>();
    selectedBuildingIds.forEach((id) => {
      const existingGroup = buildingToGroup.get(id);
      if (existingGroup) {
        existingGroups.add(existingGroup);
      }
    });

    // Remove buildings from existing groups
    if (existingGroups.size > 0) {
      setBuildingGroups((prev) => {
        const newGroups = new Map(prev);
        existingGroups.forEach((gId) => {
          const group = newGroups.get(gId);
          if (group) {
            selectedBuildingIds.forEach((bId) => group.delete(bId));
            if (group.size === 0) {
              newGroups.delete(gId);
            }
          }
        });
        newGroups.set(groupId, buildingIds);
        return newGroups;
      });
    } else {
      setBuildingGroups((prev) => new Map(prev).set(groupId, buildingIds));
    }

    // Update building to group mapping
    setBuildingToGroup((prev) => {
      const newMap = new Map(prev);
      selectedBuildingIds.forEach((id) => newMap.set(id, groupId));
      return newMap;
    });

    showToast(
      `Created group with ${buildingIds.size} buildings`,
      ErrorSeverity.INFO
    );
  }, [selectedBuildingIds, buildingToGroup, showToast]);

  // Ungroup selected buildings
  const ungroupSelected = useCallback(() => {
    const groupsToCheck = new Set<string>();
    selectedBuildingIds.forEach((id) => {
      const groupId = buildingToGroup.get(id);
      if (groupId) groupsToCheck.add(groupId);
    });

    if (groupsToCheck.size === 0) {
      showToast(
        "Selected buildings are not in any group",
        ErrorSeverity.WARNING
      );
      return;
    }

    // Remove buildings from groups
    setBuildingGroups((prev) => {
      const newGroups = new Map(prev);
      groupsToCheck.forEach((groupId) => {
        const group = newGroups.get(groupId);
        if (group) {
          selectedBuildingIds.forEach((id) => group.delete(id));
          if (group.size < 2) {
            // Remove group if less than 2 buildings remain
            if (group.size === 1) {
              const remainingId = Array.from(group)[0];
              setBuildingToGroup((p) => {
                const m = new Map(p);
                m.delete(remainingId);
                return m;
              });
            }
            newGroups.delete(groupId);
          }
        }
      });
      return newGroups;
    });

    // Update building to group mapping
    setBuildingToGroup((prev) => {
      const newMap = new Map(prev);
      selectedBuildingIds.forEach((id) => newMap.delete(id));
      return newMap;
    });

    showToast("Buildings ungrouped", ErrorSeverity.INFO);
  }, [selectedBuildingIds, buildingToGroup, showToast]);

  // Select all buildings in a group
  const selectGroup = useCallback(
    (groupId: string) => {
      const group = buildingGroups.get(groupId);
      if (group) {
        setSelectedBuildingIds(new Set(group));
        showToast(
          `Selected ${group.size} buildings in group`,
          ErrorSeverity.INFO
        );
      }
    },
    [buildingGroups, setSelectedBuildingIds, showToast]
  );

  return {
    buildingGroups,
    setBuildingGroups,
    buildingToGroup,
    setBuildingToGroup,
    getGroupColor,
    createGroup,
    ungroupSelected,
    selectGroup,
  };
}
