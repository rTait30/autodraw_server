import React from 'react';
import { Link } from 'react-router-dom';
import CollapsibleCard from './CollapsibleCard';
import { Button } from './UI';
import { TOOLS } from '../config/tools';

/**
 * Renders a list of tools in a CollapsibleCard.
 * 
 * @param {Object} props
 * @param {boolean} props.defaultOpen - Initial open state of the card
 * @param {string} props.className - Additional classes for the card container
 * @param {Object} props.user - (Future) User object for permission filtering
 */
const ToolsCard = ({ defaultOpen = false, className = "" }) => {
  const role = localStorage.getItem('role');

  const visibleTools = TOOLS.filter(tool => {
    // 1. Explicitly public tools are always shown
    if (tool.access === 'public') return true;

    // 2. Admin has access to everything by default
    if (role === 'admin') return true;

    // 3. Role-based access
    if (Array.isArray(tool.access)) {
        return tool.access.includes(role);
    }
    
    // 4. Handle single string role (legacy support)
    return tool.access === role;
  });

  if (visibleTools.length === 0) return null;

  return (
    <CollapsibleCard 
        title="Tools" 
        defaultOpen={defaultOpen}
        className={className}
        contentClassName="p-4 flex flex-col gap-4 bg-white dark:bg-gray-800"
    >
        {visibleTools.map(tool => (
            <Link key={tool.id} to={tool.path} className="w-full">
                <Button className="w-full">
                    {tool.title}
                </Button>
            </Link>
        ))}
    </CollapsibleCard>
  );
};

export default ToolsCard;
