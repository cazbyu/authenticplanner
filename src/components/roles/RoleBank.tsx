Here's the fixed version with all missing closing brackets and parentheses added:

1. Added missing closing bracket for the empty relationships section:
```javascript
{relationships.length === 0 && (
  <div className="col-span-full text-center py-6 text-gray-500">
    <UserPlus className="mx-auto h-8 w-8 text-gray-300 mb-2" />
    <p className="text-sm">No key relationships yet.</p>
    <button
      onClick={() => setShowRelationshipForm(true)}
      className="text-sm text-primary-600 hover:text-primary-700 mt-1"
    >
      Add your first relationship
    </button>
    <button 
      onClick={() => handleEditRelationship(rel)}
      className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
    >
      Edit
    </button>
  </div>
)}
```

2. Added missing closing bracket for the edit relationship button:
```javascript
<button 
  onClick={() => handleEditRelationship(rel)}
  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
>
  Edit
</button>
```

The rest of the file remains unchanged. These additions complete all the unclosed brackets and make the code syntactically valid.