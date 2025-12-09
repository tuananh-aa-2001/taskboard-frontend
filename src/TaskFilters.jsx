import { Search, Filter } from 'lucide-react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import ExportPDF from './ExportPDF';

const TaskFilters = ({
  searchQuery,
  setSearchQuery,
  filterPriority,
  setFilterPriority,
  filterAssignee,
  setFilterAssignee,
  showFilters,
  setShowFilters,
  getUniqueAssignees,
  clearFilters,
  getTasksByStatus,
  tasks,
  username,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, description, or assignee..."
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2"
        >
          <Filter size={18} />
          Filters
          {(filterPriority !== "ALL" || filterAssignee !== "ALL") && (
            <span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {(filterPriority !== "ALL" ? 1 : 0) +
                (filterAssignee !== "ALL" ? 1 : 0)}
            </span>
          )}
        </button>

        <button
          onClick={() => ExportPDF({ getTasksByStatus, tasks, username })}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
        >   
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export PDF
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignee
              </label>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Assignees</option>
                <option value="ME">Assigned to Me</option>
                <option value="UNASSIGNED">Unassigned</option>
                {getUniqueAssignees().map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchQuery ||
            filterPriority !== "ALL" ||
            filterAssignee !== "ALL") && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
